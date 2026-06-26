import Foundation

/// A project you're working on. It holds its own tasks. Importance and an optional
/// deadline are what let Waymark decide which quests' tasks deserve today.
struct Quest: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    /// 1–5, set by hand. How much this quest matters to you.
    var importance: Int
    var deadline: Deadline
    var notes: String
    var tasks: [TaskItem]
    /// Marked complete by hand (a whole quest finished).
    var isDone: Bool
    var createdAt: Date

    init(id: UUID = UUID(), name: String, importance: Int = 3, deadline: Deadline = .none,
         notes: String = "", tasks: [TaskItem] = [], isDone: Bool = false, createdAt: Date = Date()) {
        self.id = id
        self.name = name
        self.importance = min(5, max(1, importance))
        self.deadline = deadline
        self.notes = notes
        self.tasks = tasks
        self.isDone = isDone
        self.createdAt = createdAt
    }

    var openTasks: [TaskItem] { tasks.filter { !$0.done } }
    var hasOpenTasks: Bool { !openTasks.isEmpty }
    /// The next thing to do on this quest.
    var nextTask: TaskItem? { openTasks.first }
    /// Eligible to surface a task today.
    var isActionable: Bool { !isDone && hasOpenTasks }
}
