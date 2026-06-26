import Foundation
import SwiftUI

/// The single source of truth. Owns the persisted `AppData`, exposes derived views
/// (today's focus, gentle tallies), and saves atomically on every change.
@MainActor
final class DataStore: ObservableObject {
    @Published private(set) var data: AppData

    private let fileURL: URL
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    // MARK: Lifecycle

    init(fileURL: URL? = nil) {
        let enc = JSONEncoder()
        enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        enc.dateEncodingStrategy = .iso8601
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        self.encoder = enc
        self.decoder = dec

        self.fileURL = fileURL ?? DataStore.defaultFileURL()
        self.data = DataStore.load(from: self.fileURL, decoder: dec)
    }

    /// ~/Library/Application Support/Waymark/data.json
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

    // MARK: Derived state

    var quests: [Quest] { data.quests }

    var activeQuests: [Quest] {
        data.quests.filter { !$0.isDone }.sorted { Ranking.score($0) > Ranking.score($1) }
    }
    var doneQuests: [Quest] {
        data.quests.filter { $0.isDone }.sorted { ($0.createdAt) > ($1.createdAt) }
    }

    var todaysFocus: [RankedQuest] { Ranking.todaysFocus(data.quests) }
    var leadFocus: RankedQuest? { todaysFocus.first }
    var extraFocus: [RankedQuest] { Array(todaysFocus.dropFirst()) }

    var needsNextStep: [Quest] { Ranking.needsNextStep(data.quests) }

    var hasDoneEnoughToday: Bool {
        guard let d = data.enoughDate else { return false }
        return Calendar.current.isDateInToday(d)
    }

    var todaysProgress: [ProgressEvent] {
        data.events
            .filter { Calendar.current.isDateInToday($0.date) }
            .sorted { $0.date > $1.date }
    }

    /// Meaningful progress logged in the last 7 days — for a quiet, encouraging tally.
    var weeklyProgressCount: Int {
        let cal = Calendar.current
        guard let weekAgo = cal.date(byAdding: .day, value: -7, to: Date()) else { return 0 }
        return data.events.filter { $0.date >= weekAgo }.count
    }

    var completedQuestCount: Int { data.quests.filter { $0.isDone }.count }

    var hasAnyQuests: Bool { !data.quests.isEmpty }
    var hasActionableQuests: Bool { data.quests.contains { $0.isActionable } }

    // MARK: Mutations (each one saves)

    func upsert(_ quest: Quest) {
        if let i = data.quests.firstIndex(where: { $0.id == quest.id }) {
            data.quests[i] = quest
        } else {
            data.quests.append(quest)
        }
        save()
    }

    func delete(_ quest: Quest) {
        data.quests.removeAll { $0.id == quest.id }
        save()
    }

    /// Complete the current concrete step. Logs progress, clears the step (so the quest
    /// stops being pushed until a new one is named), and, if this was today's leading
    /// focus, declares the day "enough."
    func completeNextStep(_ quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        let isLeader = leadFocus?.id == quest.id
        let detail = data.quests[i].nextStep.trimmingCharacters(in: .whitespacesAndNewlines)

        data.events.append(ProgressEvent(
            questID: quest.id, kind: .completedStep,
            detail: detail.isEmpty ? "Completed a step" : detail,
            questName: data.quests[i].name
        ))
        data.quests[i].nextStep = ""

        if isLeader { data.enoughDate = Date() }
        save()
    }

    func setNextStep(_ text: String, for quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        data.quests[i].nextStep = text
        save()
    }

    /// Advance the quest one stage along its arc. Counts as winning the day if it leads.
    func advanceStage(_ quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }),
              let next = data.quests[i].stage.next else { return }
        let isLeader = leadFocus?.id == quest.id
        let from = data.quests[i].stage
        data.quests[i].stage = next

        data.events.append(ProgressEvent(
            questID: quest.id, kind: .advancedStage,
            detail: "\(from.title) → \(next.title)",
            questName: data.quests[i].name
        ))

        if isLeader { data.enoughDate = Date() }
        save()
    }

    /// Consciously call the day — resting is a valid way to win it.
    func declareEnoughForToday() {
        data.enoughDate = Date()
        save()
    }

    func reopenToday() {
        if hasDoneEnoughToday { data.enoughDate = nil; save() }
    }

    // MARK: Sample data (first-run "try it" affordance)

    func loadSampleQuests() {
        let now = Date()
        let cal = Calendar.current
        func days(_ n: Int) -> Date { cal.date(byAdding: .day, value: n, to: now) ?? now }

        let samples: [Quest] = [
            Quest(name: "Short film — Pelagos", importance: 5,
                  deadline: Deadline(type: .hard, date: days(4)), stage: .active,
                  nextStep: "Render shot 14",
                  notes: "The one that matters most."),
            Quest(name: "Client brand reel", importance: 3,
                  deadline: Deadline(type: .soft, date: days(9)), stage: .developing,
                  nextStep: "Lock the music selects"),
            Quest(name: "Documentary treatment", importance: 5,
                  deadline: .none, stage: .developing,
                  nextStep: "Outline act two"),
            Quest(name: "Photo book", importance: 2,
                  deadline: .none, stage: .idea,
                  nextStep: "Pick 30 favorite frames")
        ]
        for q in samples where !data.quests.contains(where: { $0.name == q.name }) {
            data.quests.append(q)
        }
        save()
    }

    /// Remove the example quests (handy after trying it out).
    func removeSampleQuests() {
        let names: Set<String> = ["Short film — Pelagos", "Client brand reel",
                                  "Documentary treatment", "Photo book"]
        data.quests.removeAll { names.contains($0.name) }
        save()
    }

    var hasSampleQuests: Bool {
        let names: Set<String> = ["Short film — Pelagos", "Client brand reel",
                                  "Documentary treatment", "Photo book"]
        return data.quests.contains { names.contains($0.name) }
    }
}
