import Foundation

/// A record of real progress — a task finished or a whole quest completed. Powers the
/// "what you did today" recap and a quiet weekly tally.
struct ProgressEvent: Codable, Identifiable, Hashable {
    enum Kind: String, Codable {
        case completedTask
        case completedQuest
    }
    var id: UUID
    var questID: UUID
    var kind: Kind
    var date: Date
    var detail: String
    var questName: String

    init(id: UUID = UUID(), questID: UUID, kind: Kind, date: Date = Date(),
         detail: String, questName: String) {
        self.id = id
        self.questID = questID
        self.kind = kind
        self.date = date
        self.detail = detail
        self.questName = questName
    }
}
