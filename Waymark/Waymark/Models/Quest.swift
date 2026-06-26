import Foundation

/// A project, framed as a quest. The single most important field is `nextStep`:
/// a project name alone is paralyzing ("Pelagos"), a concrete next step is doable
/// ("render shot 14"). The UI always surfaces the step, never just the name.
struct Quest: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    /// 1–5, set by hand. How much this quest matters to you.
    var importance: Int
    var deadline: Deadline
    var stage: Stage
    /// The single concrete next step. THE most important field.
    var nextStep: String
    var notes: String
    var createdAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        importance: Int = 3,
        deadline: Deadline = .none,
        stage: Stage = .idea,
        nextStep: String = "",
        notes: String = "",
        createdAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.importance = min(5, max(1, importance))
        self.deadline = deadline
        self.stage = stage
        self.nextStep = nextStep
        self.notes = notes
        self.createdAt = createdAt
    }

    /// Tolerate older saved files (which used `strategicWeight` / `nextAction` / `axis`).
    enum CodingKeys: String, CodingKey {
        case id, name, importance, deadline, stage, nextStep, notes, createdAt
        case strategicWeight, nextAction
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = (try? c.decode(UUID.self, forKey: .id)) ?? UUID()
        name = (try? c.decode(String.self, forKey: .name)) ?? ""
        importance = (try? c.decode(Int.self, forKey: .importance))
            ?? (try? c.decode(Int.self, forKey: .strategicWeight)) ?? 3
        deadline = (try? c.decode(Deadline.self, forKey: .deadline)) ?? .none
        stage = (try? c.decode(Stage.self, forKey: .stage)) ?? .idea
        nextStep = (try? c.decode(String.self, forKey: .nextStep))
            ?? (try? c.decode(String.self, forKey: .nextAction)) ?? ""
        notes = (try? c.decode(String.self, forKey: .notes)) ?? ""
        createdAt = (try? c.decode(Date.self, forKey: .createdAt)) ?? Date()
        importance = min(5, max(1, importance))
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(name, forKey: .name)
        try c.encode(importance, forKey: .importance)
        try c.encode(deadline, forKey: .deadline)
        try c.encode(stage, forKey: .stage)
        try c.encode(nextStep, forKey: .nextStep)
        try c.encode(notes, forKey: .notes)
        try c.encode(createdAt, forKey: .createdAt)
    }

    var isDone: Bool { stage == .done }

    var hasNextStep: Bool {
        !nextStep.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// A quest can be a focus candidate only if it is unfinished and has a concrete step.
    var isActionable: Bool { !isDone && hasNextStep }
}
