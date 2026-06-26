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
        var loaded = DataStore.load(from: url, decoder: dec)
        // One-time clean slate for data from earlier builds (clears stale demo data
        // and re-runs the intro). The chosen background is preserved.
        if loaded.schemaVersion < AppData.currentSchemaVersion {
            loaded = AppData(backgroundImageName: loaded.backgroundImageName)
        }
        self.data = loaded
        save()
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
        do { try encoder.encode(data).write(to: fileURL, options: [.atomic]) }
        catch {
            #if DEBUG
            print("Waymark save failed: \(error)")
            #endif
        }
    }

    // MARK: Onboarding
    var onboardingComplete: Bool { data.onboardingComplete }
    func completeOnboarding() { data.onboardingComplete = true; save() }
    func restartOnboarding() { data.onboardingComplete = false; save() }

    // MARK: Quests
    var quests: [Quest] { data.quests }
    var activeQuests: [Quest] { data.quests.filter { !$0.isDone }.sorted { Ranking.score($0) > Ranking.score($1) } }
    var doneQuests: [Quest] { data.quests.filter { $0.isDone }.sorted { $0.createdAt > $1.createdAt } }
    var hasAnyQuests: Bool { !data.quests.isEmpty }

    // MARK: Today
    var todaysTasks: [RankedTask] { Ranking.todaysTasks(data.quests) }
    var leadTask: RankedTask? { todaysTasks.first }
    var extraTasks: [RankedTask] { Array(todaysTasks.dropFirst()) }
    var needsTask: [Quest] { Ranking.needsTask(data.quests) }
    var hasActionable: Bool { data.quests.contains { $0.isActionable } }

    var hasDoneEnoughToday: Bool {
        guard let d = data.enoughDate else { return false }
        return Calendar.current.isDateInToday(d)
    }
    var todaysProgress: [ProgressEvent] {
        data.events.filter { Calendar.current.isDateInToday($0.date) }.sorted { $0.date > $1.date }
    }
    var weeklyProgressCount: Int {
        let cal = Calendar.current
        guard let weekAgo = cal.date(byAdding: .day, value: -7, to: Date()) else { return 0 }
        return data.events.filter { $0.date >= weekAgo }.count
    }

    // MARK: Quest mutations
    func upsert(_ quest: Quest) {
        if let i = data.quests.firstIndex(where: { $0.id == quest.id }) { data.quests[i] = quest }
        else { data.quests.append(quest) }
        save()
    }
    func delete(_ quest: Quest) { data.quests.removeAll { $0.id == quest.id }; save() }

    func markQuestDone(_ quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        data.quests[i].isDone = true
        data.events.append(ProgressEvent(questID: quest.id, kind: .completedQuest,
                                         detail: "Completed", questName: data.quests[i].name))
        save()
    }
    func reopenQuest(_ quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        data.quests[i].isDone = false; save()
    }

    // MARK: Task mutations
    func addTask(_ title: String, to quest: Quest) {
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, let i = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        data.quests[i].tasks.append(TaskItem(title: t)); save()
    }

    /// Complete a task. Logs progress; if it was today's leading task, the day is "enough."
    func completeTask(_ task: TaskItem, in quest: Quest) {
        guard let qi = data.quests.firstIndex(where: { $0.id == quest.id }),
              let ti = data.quests[qi].tasks.firstIndex(where: { $0.id == task.id }) else { return }
        let isLeader = leadTask?.id == task.id
        data.quests[qi].tasks[ti].done = true
        data.quests[qi].tasks[ti].completedAt = Date()
        data.events.append(ProgressEvent(questID: quest.id, kind: .completedTask,
                                         detail: data.quests[qi].tasks[ti].title, questName: data.quests[qi].name))
        if isLeader { data.enoughDate = Date() }
        save()
    }
    func uncompleteTask(_ task: TaskItem, in quest: Quest) {
        guard let qi = data.quests.firstIndex(where: { $0.id == quest.id }),
              let ti = data.quests[qi].tasks.firstIndex(where: { $0.id == task.id }) else { return }
        data.quests[qi].tasks[ti].done = false
        data.quests[qi].tasks[ti].completedAt = nil
        save()
    }
    func deleteTask(_ task: TaskItem, in quest: Quest) {
        guard let qi = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        data.quests[qi].tasks.removeAll { $0.id == task.id }; save()
    }

    func declareEnoughForToday() { data.enoughDate = Date(); save() }
    func reopenToday() { if hasDoneEnoughToday { data.enoughDate = nil; save() } }

    // MARK: Reset
    func resetAll() {
        let bg = data.backgroundImageName
        data = AppData(backgroundImageName: bg)
        save()
    }

    // MARK: AI import (Option A — paste bridge)
    @discardableResult
    func importFromAI(_ text: String) throws -> (quests: Int, tasks: Int) {
        let payload = try AIImport.parse(text)
        let questsIn = payload.quests ?? []
        guard !questsIn.isEmpty else { throw AIImport.ImportError.empty }
        var taskCount = 0
        for qin in questsIn {
            let name = qin.name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !name.isEmpty else { continue }
            let dt = AIImport.deadlineType(from: qin.deadlineType)
            let deadline = Deadline(type: dt, date: dt == .none ? nil : AIImport.date(from: qin.deadline))
            let tasks = (qin.tasks ?? []).map { TaskItem(title: $0) }.filter { !$0.title.isEmpty }
            taskCount += tasks.count
            data.quests.append(Quest(name: name, importance: qin.importance ?? 3,
                                     deadline: deadline, tasks: tasks))
        }
        save()
        return (questsIn.count, taskCount)
    }

    // MARK: Background image
    var backgroundImage: NSImage? {
        if let cached = bgCache { return cached }
        guard let name = data.backgroundImageName else { return nil }
        let url = dir.appendingPathComponent("Backgrounds", isDirectory: true).appendingPathComponent(name)
        guard let img = NSImage(contentsOf: url) else { return nil }
        bgCache = img
        return img
    }
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
            data.backgroundImageName = name
            bgCache = NSImage(contentsOf: dest)
            save()
        } catch {
            #if DEBUG
            print("Waymark background copy failed: \(error)")
            #endif
        }
    }
    func clearBackgroundImage() { data.backgroundImageName = nil; bgCache = nil; save() }
    var hasCustomBackground: Bool { data.backgroundImageName != nil }
}
