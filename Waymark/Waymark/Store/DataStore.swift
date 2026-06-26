import Foundation
import SwiftUI

/// The single source of truth. Owns the persisted `AppData`, exposes derived views
/// (today's focus, the strategic tracks), and saves atomically on every change.
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
            // Never lose a good file silently: keep a backup, start fresh.
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
            // A failed save shouldn't crash the app; surfacing this is a later concern.
            #if DEBUG
            print("Waymark save failed: \(error)")
            #endif
        }
    }

    // MARK: Derived state

    var quests: [Quest] { data.quests }

    var todaysFocus: [RankedQuest] { Ranking.todaysFocus(data.quests) }

    var needsNextStep: [Quest] { Ranking.needsNextStep(data.quests) }

    var tracks: [StrategicTrack] {
        StrategicAxis.allCases.map { StrategicTrack.make(axis: $0, events: data.events) }
    }

    func track(for axis: StrategicAxis) -> StrategicTrack {
        StrategicTrack.make(axis: axis, events: data.events)
    }

    /// Have I done the important thing today? True once `enoughDate` is today.
    var hasDoneEnoughToday: Bool {
        guard let d = data.enoughDate else { return false }
        return Calendar.current.isDateInToday(d)
    }

    /// The meaningful progress logged today, newest first — shown in the Enough state.
    var todaysProgress: [ProgressEvent] {
        data.events
            .filter { Calendar.current.isDateInToday($0.date) }
            .sorted { $0.date > $1.date }
    }

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

    /// Complete the current concrete step. Meaningful progress: logs an event,
    /// clears the step (so the quest stops being pushed until a new step is named),
    /// and, if this was today's leading focus, declares the day "enough."
    func completeNextAction(_ quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        let isLeader = todaysFocus.first?.id == quest.id
        let detail = data.quests[i].nextAction.trimmingCharacters(in: .whitespacesAndNewlines)

        data.events.append(ProgressEvent(
            questID: quest.id, axis: data.quests[i].axis, kind: .completedAction,
            detail: detail.isEmpty ? "Completed a step" : detail,
            questName: data.quests[i].name
        ))
        data.quests[i].nextAction = ""

        if isLeader { data.enoughDate = Date() }
        save()
    }

    /// Set or replace the concrete next step.
    func setNextAction(_ text: String, for quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }) else { return }
        data.quests[i].nextAction = text
        save()
    }

    /// Advance the quest one stage along its arc. Meaningful progress: logs an event,
    /// and counts as winning the day if this was today's leader.
    func advanceStage(_ quest: Quest) {
        guard let i = data.quests.firstIndex(where: { $0.id == quest.id }),
              let next = data.quests[i].stage.next else { return }
        let isLeader = todaysFocus.first?.id == quest.id
        let from = data.quests[i].stage
        data.quests[i].stage = next

        data.events.append(ProgressEvent(
            questID: quest.id, axis: data.quests[i].axis, kind: .advancedStage,
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

    /// Undo today's "enough" if I decide I do want to keep going.
    func reopenToday() {
        if hasDoneEnoughToday { data.enoughDate = nil; save() }
    }

    // MARK: Sample data (first-run "try it" affordance)

    func loadSampleQuests() {
        let now = Date()
        let cal = Calendar.current
        func days(_ n: Int) -> Date { cal.date(byAdding: .day, value: n, to: now) ?? now }

        let samples: [Quest] = [
            Quest(name: "Pelagos — short film", axis: .ip, strategicWeight: 5,
                  deadline: Deadline(type: .hard, date: days(4)), stage: .active,
                  nextAction: "Render shot 14",
                  notes: "The one that matters most. Festival cut due."),
            Quest(name: "Client brand reel", axis: .income, strategicWeight: 3,
                  deadline: Deadline(type: .soft, date: days(9)), stage: .developing,
                  nextAction: "Lock the music selects"),
            Quest(name: "Panel talk submission", axis: .reputation, strategicWeight: 4,
                  deadline: Deadline(type: .hard, date: days(12)), stage: .idea,
                  nextAction: "Draft the 200-word pitch"),
            Quest(name: "Documentary treatment", axis: .mission, strategicWeight: 5,
                  deadline: .none, stage: .developing,
                  nextAction: "Outline act two",
                  notes: "No deadline — exactly why the track has to keep it visible."),
            Quest(name: "Stock footage library", axis: .income, strategicWeight: 2,
                  deadline: .none, stage: .active,
                  nextAction: "Tag last week's clips")
        ]
        for q in samples where !data.quests.contains(where: { $0.name == q.name }) {
            data.quests.append(q)
        }
        save()
    }
}
