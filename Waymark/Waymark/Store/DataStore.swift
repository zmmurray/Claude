import Foundation
import SwiftUI
import AppKit

/// The single source of truth. Owns the persisted `AppData`, exposes derived views,
/// and saves atomically on every change.
@MainActor
final class DataStore: ObservableObject {
    @Published private(set) var data: AppData

    private let fileURL: URL
    private let dir: URL
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    private var bgCache: NSImage?

    // MARK: Lifecycle

    init(fileURL: URL? = nil) {
        let enc = JSONEncoder()
        enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        enc.dateEncodingStrategy = .iso8601
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        self.encoder = enc
        self.decoder = dec

        let url = fileURL ?? DataStore.defaultFileURL()
        self.fileURL = url
        self.dir = url.deletingLastPathComponent()
        self.data = DataStore.load(from: url, decoder: dec)
    }

    static func defaultFileURL() -> URL {
        let fm = FileManager.default
        let base = (try? fm.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                appropriateFor: nil, create: true))
            ?? fm.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support")
        let dir = base.appendingPathComponent("Waymark", isDirectory: true)
        try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("data.json")
    }

    private static func load(from url: URL, decoder: JSONDecoder) -> AppData {
        guard let bytes = try? Data(contentsOf: url), !bytes.isEmpty else { return AppData() }
        do { return try decoder.decode(AppData.self, from: bytes) }
        catch {
            let backup = url.deletingPathExtension().appendingPathExtension("corrupt.json")
            try? bytes.write(to: backup, options: .atomic)
            return AppData()
        }
    }

    private func save() {
        do {
            let bytes = try encoder.encode(data)
            try bytes.write(to: fileURL, options: [.atomic])
        } catch {
            #if DEBUG
            print("Waymark save failed: \(error)")
            #endif
        }
    }

    // MARK: Onboarding

    var onboardingComplete: Bool { data.onboardingComplete }
    func completeOnboarding() { data.onboardingComplete = true; save() }
    func restartOnboarding() { data.onboardingComplete = false; save() }

    // MARK: Goals

    var goals: [Goal] { data.goals }

    func addGoal(named name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let idx = data.goals.count % Theme.goalPalette.count
        data.goals.append(Goal(name: trimmed, colorIndex: idx))
        save()
    }
    func renameGoal(_ goal: Goal, to name: String) {
        guard let i = data.goals.firstIndex(where: { $0.id == goal.id }) else { return }
        data.goals[i].name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        save()
    }
    func deleteGoal(_ goal: Goal) {
        data.goals.removeAll { $0.id == goal.id }
        for i in data.quests.indices where data.quests[i].goalID == goal.id {
            data.quests[i].goalID = nil
        }
        save()
    }
    func goal(_ id: UUID?) -> Goal? {
        guard let id else { return nil }
        return data.goals.first { $0.id == id }
    }

    // MARK: Quests

    var quests: [Quest] { data.quests }
    var activeQuests: [Quest] { data.quests.filter { !$0.isDone }.sorted { Ranking.score($0) > Ranking.score($1) } }
    var doneQuests: [Quest] { data.quests.filter { $0.isDone }.sorted { $0.createdAt > $1.createdAt } }

    func quests(forGoal id: UUID?) -> [Quest] {
        activeQuests.filter { $0.goalID == id }
    }

    var todaysFocus: [RankedQuest] { Ranking.todaysFocus(data.quests) }
    var leadFocus: RankedQuest? { todaysFocus.first }
    var extraFocus: [RankedQuest] { Array(todaysFocus.dropFirst()) }
    var needsNextStep: [Quest] { Ranking.needsNextStep(data.quests) }

    var hasAnyQuests: Bool { !data.quests.isEmpty }
    var hasActionableQuests: Bool { data.quests.contains { $0.isActionable } }

    // MARK: Enough state

    var hasDoneEnoughToday: Bool {
        guard let d = data.enoughDate else { return false }
        return Calendar.current.isDateInToday(d)
    }
    var todaysProgress: [ProgressEvent] {
        data.events.filter { Calendar.current.isDateInToday($0.date) }.sorted { $0.date > $1.date }
    }

    // MARK: Per-goal long-game progress

    /// Total meaningful milestones recorded for a goal.
    func milestones(forGoal id: UUID) -> Int {
        data.events.filter { $0.goalID == id }.count
    }
    func lastProgress(forGoal id: UUID) -> Date? {
        data.events.filter { $0.goalID == id }.map(\.date).max()
    }
    /// Days since this goal last saw progress (nil if never).
    func daysSinceProgress(forGoal id: UUID) -> Int? {
        guard let last = lastProgress(forGoal: id) else { return nil }
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: last), to: cal.startOfDay(for: Date())).day
    }
    /// A goal with quests but no progress in two weeks is being neglected.
    func isNeglected(_ goal: Goal) -> Bool {
        guard quests(forGoal: goal.id).contains(where: { !$0.isDone }) else { return false }
        if let days = daysSinceProgress(forGoal: goal.id) { return days >= 14 }
        return milestones(forGoal: goal.id) == 0
    }

    var weeklyProgressCount: Int {
        let cal = Calendar.current
        guard let weekAgo = cal.date(byAdding: .day, value: -7, to: Date()) else { return 0 }
        return data.events.filter { $0.date >= weekAgo }.count
    }

    // MARK: Mutations

    func upsert(_ quest: Quest) {
        if let i = data.quests.firstIndex(where: { $0.id == quest.id }) { data.quests[i] = quest }
        else { data.quests.append(quest) }
        save()
    }
    func delete(_ quest: Quest) { data.quests.removeAll { $0.id == quest.id }; save() }

    func completeNextStep(_ quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        let isLeader = leadFocus?.id == quest.id
        let detail = data.quests[i].nextStep.trimmingCharacters(in: .whitespacesAndNewlines)
        data.events.append(ProgressEvent(
            questID: quest.id, goalID: data.quests[i].goalID, kind: .completedStep,
            detail: detail.isEmpty ? "Completed a step" : detail, questName: data.quests[i].name))
        data.quests[i].nextStep = ""
        if isLeader { data.enoughDate = Date() }
        save()
    }

    func setNextStep(_ text: String, for quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        data.quests[i].nextStep = text
        save()
    }

    func advanceStage(_ quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }),
              let next = data.quests[i].stage.next else { return }
        let isLeader = leadFocus?.id == quest.id
        let from = data.quests[i].stage
        data.quests[i].stage = next
        data.events.append(ProgressEvent(
            questID: quest.id, goalID: data.quests[i].goalID, kind: .advancedStage,
            detail: "\(from.title) → \(next.title)", questName: data.quests[i].name))
        if isLeader { data.enoughDate = Date() }
        save()
    }

    func declareEnoughForToday() { data.enoughDate = Date(); save() }
    func reopenToday() { if hasDoneEnoughToday { data.enoughDate = nil; save() } }

    // MARK: Background image

    var backgroundImage: NSImage? {
        if let cached = bgCache { return cached }
        guard let name = data.backgroundImageName else { return nil }
        let url = dir.appendingPathComponent("Backgrounds", isDirectory: true).appendingPathComponent(name)
        guard let img = NSImage(contentsOf: url) else { return nil }
        bgCache = img
        return img
    }

    /// Copy a chosen image into the app-support Backgrounds folder and use it.
    func setBackgroundImage(from source: URL) {
        let fm = FileManager.default
        let bgDir = dir.appendingPathComponent("Backgrounds", isDirectory: true)
        try? fm.createDirectory(at: bgDir, withIntermediateDirectories: true)
        let ext = source.pathExtension.isEmpty ? "jpg" : source.pathExtension
        let name = "backdrop.\(ext)"
        let dest = bgDir.appendingPathComponent(name)
        try? fm.removeItem(at: dest)
        do {
            try fm.copyItem(at: source, to: dest)
            // Clear any other stored backdrops to avoid stale files.
            data.backgroundImageName = name
            bgCache = NSImage(contentsOf: dest)
            save()
        } catch {
            #if DEBUG
            print("Waymark background copy failed: \(error)")
            #endif
        }
    }

    func clearBackgroundImage() {
        data.backgroundImageName = nil
        bgCache = nil
        save()
    }

    var hasCustomBackground: Bool { data.backgroundImageName != nil }

    // MARK: Sample data

    func loadSampleData() {
        if data.goals.isEmpty {
            ["My film work", "Provide for my family", "Stay creative"].enumerated().forEach { i, n in
                data.goals.append(Goal(name: n, colorIndex: i))
            }
        }
        let now = Date(); let cal = Calendar.current
        func days(_ n: Int) -> Date { cal.date(byAdding: .day, value: n, to: now) ?? now }
        let film = data.goals.first?.id
        let family = data.goals.count > 1 ? data.goals[1].id : nil
        let creative = data.goals.count > 2 ? data.goals[2].id : nil

        let samples: [Quest] = [
            Quest(name: "Short film — Pelagos", goalID: film, importance: 5,
                  deadline: Deadline(type: .hard, date: days(4)), stage: .active, nextStep: "Render shot 14"),
            Quest(name: "Client brand reel", goalID: family, importance: 3,
                  deadline: Deadline(type: .soft, date: days(9)), stage: .developing, nextStep: "Lock the music selects"),
            Quest(name: "Photo series", goalID: creative, importance: 2,
                  deadline: .none, stage: .idea, nextStep: "Pick 30 favorite frames")
        ]
        for q in samples where !data.quests.contains(where: { $0.name == q.name }) {
            data.quests.append(q)
        }
        save()
    }
}
