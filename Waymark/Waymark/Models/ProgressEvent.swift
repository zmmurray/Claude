import Foundation

/// A single act of *meaningful* progress — a step completed or a stage advanced.
/// Volume of busywork never generates these, by design. Used for the "what you did
/// today" recap and the gentle weekly tally.
struct ProgressEvent: Codable, Identifiable, Hashable {
    enum Kind: String, Codable {
        case completedStep
        case advancedStage
    }

    var id: UUID
    var questID: UUID
    /// The goal this progress served (captured at the time, so the journey is stable).
    var goalID: UUID?
    var kind: Kind
    var date: Date
    /// Human-readable note, e.g. "render shot 14" or "Idea → Planning".
    var detail: String
    /// The quest's name at the time, so history reads well even if it's renamed/deleted.
    var questName: String

    init(
        id: UUID = UUID(),
        questID: UUID,
        goalID: UUID? = nil,
        kind: Kind,
        date: Date = Date(),
        detail: String,
        questName: String
    ) {
        self.id = id
        self.questID = questID
        self.goalID = goalID
        self.kind = kind
        self.date = date
        self.detail = detail
        self.questName = questName
    }

    /// Tolerate older saved events (which used `completedAction` and carried `axis`).
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = (try? c.decode(UUID.self, forKey: .id)) ?? UUID()
        questID = (try? c.decode(UUID.self, forKey: .questID)) ?? UUID()
        goalID = try? c.decodeIfPresent(UUID.self, forKey: .goalID)
        let raw = (try? c.decode(String.self, forKey: .kind)) ?? "completedStep"
        kind = (raw == "advancedStage") ? .advancedStage : .completedStep
        date = (try? c.decode(Date.self, forKey: .date)) ?? Date()
        detail = (try? c.decode(String.self, forKey: .detail)) ?? ""
        questName = (try? c.decode(String.self, forKey: .questName)) ?? ""
    }

    enum CodingKeys: String, CodingKey {
        case id, questID, goalID, kind, date, detail, questName
    }
}
