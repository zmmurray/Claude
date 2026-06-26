import Foundation

/// A project you track time against.
struct Project: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String

    init(id: UUID = UUID(), name: String) {
        self.id = id
        self.name = name
    }
}

/// A completed, finalized time session. Duration is always computed from the
/// start/end timestamps so it stays correct regardless of how it was recorded.
struct Session: Codable, Identifiable, Hashable {
    let id: UUID
    let projectId: UUID
    let startDate: Date
    let endDate: Date

    init(id: UUID = UUID(), projectId: UUID, startDate: Date, endDate: Date) {
        self.id = id
        self.projectId = projectId
        self.startDate = startDate
        self.endDate = endDate
    }

    var duration: TimeInterval { endDate.timeIntervalSince(startDate) }
}

/// The in-progress session. Persisted so a graceful quit can finalize it; if it
/// is found on launch it means the previous process died unexpectedly and it is
/// discarded rather than resumed (we never want to log idle/overnight time).
struct RunningSession: Codable, Hashable {
    let projectId: UUID
    let startDate: Date
}

/// The complete on-disk document.
struct AppData: Codable {
    var projects: [Project] = []
    var sessions: [Session] = []
    var running: RunningSession? = nil
}
