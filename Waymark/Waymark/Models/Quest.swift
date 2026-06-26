import Foundation

/// A project, framed as a quest. Two fields carry the weight:
/// `nextStep` — the single concrete thing you could start now (a project name alone
/// is paralyzing); and `goalID` — which life goal this serves (the why).
struct Quest: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    /// Which life goal this serves. Optional so nothing is forced.
    var goalID: UUID?
    /// 1–5, set by hand. How much this quest matters to you.
    var importance: Int
    var deadline: Deadline
    var stage: Stage
    var nextStep: String
    var notes: String
    var createdAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        goalID: UUID? = nil,
        importance: Int = 3,
        deadline: Deadline = .none,
        stage: Stage = .idea,
        nextStep: String = "",
        notes: String = "",
        createdAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.goalID = goalID
        self.importance = min(5, max(1, importance))
        self.deadline = deadline
        self.stage = stage
        self.nextStep = nextStep
        self.notes = notes
        self.createdAt = createdAt
    }

    /// Tolerate older saved files (which used `strategicWeight` / `nextAction`, no goal).
    enum CodingKeys: String, CodingKey {
        case id, name, goalID, importance, deadline, stage, nextStep, notes, createdAt
        case strategicWeight, nextAction
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = (try? c.decode(UUID.self, forKey: .id)) ?? UUID()
        name = (try? c.decode(String.self, forKey: .name)) ?? ""
        goalID = try? c.decodeIfPresent(UUID.self, forKey: .goalID)
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
        try c.encodeIfPresent(goalID, forKey: .goalID)
        try c.encode(importance, forKey: .importance)
        try c.encode(deadline, forKey: .deadline)
        try c.encode(stage, forKey: .stage)
        try c.encode(nextStep, forKey: .nextStep)
        try c.encode(notes, forKey: .notes)
        try c.encode(createdAt, forKey: .createdAt)
    }

    var isDone: Bool { stage == .done }
    var hasNextStep: Bool { !nextStep.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    var isActionable: Bool { !isDone && hasNextStep }
}
