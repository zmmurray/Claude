import Foundation

/// A project, framed as a quest. The single most important field is `nextAction`:
/// a project name is paralyzing ("Pelagos"), a concrete next step is doable
/// ("render shot 14"). The UI always surfaces the action, never just the name.
struct Quest: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    var axis: StrategicAxis
    /// 1–5, set by hand. This is *importance to my real life*, not only career.
    var strategicWeight: Int
    var deadline: Deadline
    var stage: Stage
    var nextAction: String
    var notes: String
    var createdAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        axis: StrategicAxis,
        strategicWeight: Int = 3,
        deadline: Deadline = .none,
        stage: Stage = .idea,
        nextAction: String = "",
        notes: String = "",
        createdAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.axis = axis
        self.strategicWeight = min(5, max(1, strategicWeight))
        self.deadline = deadline
        self.stage = stage
        self.nextAction = nextAction
        self.notes = notes
        self.createdAt = createdAt
    }

    var isDone: Bool { stage == .done }

    var hasNextAction: Bool {
        !nextAction.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// A quest can be a focus candidate only if it is unfinished and has a concrete step.
    var isActionable: Bool { !isDone && hasNextAction }
}
