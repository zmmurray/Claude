import Foundation

enum DeadlineType: String, Codable, CaseIterable, Identifiable, Hashable {
    case hard
    case soft
    case none

    var id: String { rawValue }

    var label: String {
        switch self {
        case .hard: return "Hard"
        case .soft: return "Soft"
        case .none: return "None"
        }
    }
}

/// A deadline is a *type* plus an optional date. "none" means the work has no clock
/// on it — the long-horizon axes (Reputation, IP) often live here, which is exactly
/// why they need the strategic tracks to stay visible.
struct Deadline: Codable, Hashable {
    var type: DeadlineType
    var date: Date?

    static let none = Deadline(type: .none, date: nil)

    var hasDate: Bool { type != .none && date != nil }

    /// Whole days from today's start to the deadline's start. Negative = overdue.
    func daysFromNow(_ now: Date = Date()) -> Int? {
        guard let date else { return nil }
        let cal = Calendar.current
        let start = cal.startOfDay(for: now)
        let end = cal.startOfDay(for: date)
        return cal.dateComponents([.day], from: start, to: end).day
    }
}
