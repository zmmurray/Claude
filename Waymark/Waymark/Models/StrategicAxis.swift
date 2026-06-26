import SwiftUI

/// The four life-goals a quest can serve. This answers "which goal," not "how important."
/// Importance is the quest's `strategicWeight`; the axis is the *direction*.
enum StrategicAxis: String, Codable, CaseIterable, Identifiable, Hashable {
    case reputation = "Reputation/Rooms"
    case income     = "Income"
    case ip         = "IP/Slate"
    case mission    = "Mission"

    var id: String { rawValue }

    /// Short label for tight spaces.
    var shortName: String {
        switch self {
        case .reputation: return "Reputation"
        case .income:     return "Income"
        case .ip:         return "IP / Slate"
        case .mission:    return "Mission"
        }
    }

    /// A one-line sense of what the axis is for — shown in the Tracks view.
    var blurb: String {
        switch self {
        case .reputation: return "Being known, getting in the room."
        case .income:     return "Work that pays the bills."
        case .ip:         return "Owned ideas, the long slate."
        case .mission:    return "The work that matters most to you."
        }
    }

    /// A calm, desaturated hue per axis. The app keeps ONE warm accent (Theme.accent)
    /// for the focal action; these axis hues stay muted so they read as quiet
    /// wayfinding color, never as a loud dashboard.
    var color: Color {
        switch self {
        case .reputation: return Color(red: 0.81, green: 0.53, blue: 0.50) // clay rose
        case .income:     return Color(red: 0.56, green: 0.71, blue: 0.56) // sage
        case .ip:         return Color(red: 0.63, green: 0.61, blue: 0.83) // muted violet
        case .mission:    return Color(red: 0.45, green: 0.69, blue: 0.75) // slate teal
        }
    }
}
