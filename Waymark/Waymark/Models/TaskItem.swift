import Foundation

/// A single to-do inside a quest. (Named TaskItem, not Task, to avoid colliding
/// with Swift's concurrency `Task`.)
struct TaskItem: Codable, Identifiable, Hashable {
    var id: UUID
    var title: String
    var done: Bool
    var createdAt: Date
    var completedAt: Date?

    init(id: UUID = UUID(), title: String, done: Bool = false,
         createdAt: Date = Date(), completedAt: Date? = nil) {
        self.id = id
        self.title = title
        self.done = done
        self.createdAt = createdAt
        self.completedAt = completedAt
    }
}
