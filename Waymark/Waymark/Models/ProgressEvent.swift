import Foundation

/// A single act of *meaningful* progress. This is deliberately not "a task was checked
/// off" — it's an action completed or a stage advanced. Volume of busywork never
/// generates these, by design. Tracks are derived from this log.
struct ProgressEvent: Codable, Identifiable, Hashable {
    enum Kind: String, Codable {
        case completedAction   // finished the concrete next step
        case advancedStage     // the quest reached a new stage

        /// Weight toward a strategic track. A stage advance is the bigger milestone.
        var points: Int {
            switch self {
            case .completedAction: return 1
            case .advancedStage:   return 2
            }
        }
    }

    var id: UUID
    var questID: UUID
    var axis: StrategicAxis
    var kind: Kind
    var date: Date
    /// Human-readable note, e.g. "render shot 14" or "Idea → Developing".
    var detail: String
    /// The quest's name at the time, so the history reads well even if renamed/deleted.
    var questName: String

    init(
        id: UUID = UUID(),
        questID: UUID,
        axis: StrategicAxis,
        kind: Kind,
        date: Date = Date(),
        detail: String,
        questName: String
    ) {
        self.id = id
        self.questID = questID
        self.axis = axis
        self.kind = kind
        self.date = date
        self.detail = detail
        self.questName = questName
    }
}
