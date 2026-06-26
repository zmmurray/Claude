import Foundation

/// The arc of a quest. Advancing a stage is *meaningful* progress — it feeds the
/// strategic tracks and is one of the two satisfying core interactions.
enum Stage: String, Codable, CaseIterable, Identifiable, Hashable {
    case idea
    case developing
    case active
    case delivered      // delivered / pitched
    case done

    var id: String { rawValue }

    var title: String {
        switch self {
        case .idea:       return "Idea"
        case .developing: return "Developing"
        case .active:     return "Active"
        case .delivered:  return "Delivered / Pitched"
        case .done:       return "Done"
        }
    }

    /// Position along the arc, used for progress dots and ordering.
    var order: Int { Stage.allCases.firstIndex(of: self) ?? 0 }

    /// The next stage along the arc, or nil if already done.
    var next: Stage? {
        let all = Stage.allCases
        guard let i = all.firstIndex(of: self), i + 1 < all.count else { return nil }
        return all[i + 1]
    }

    var isTerminal: Bool { self == .done }
}
