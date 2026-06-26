import SwiftUI

/// A life goal, in the user's own words — "the why." Quests are tied to a goal so
/// the user always sees not just what they're doing but what it's in service of.
/// Importance is theirs to define and is not limited to career.
struct Goal: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    /// Index into Theme.goalPalette — a quiet color tag.
    var colorIndex: Int
    var createdAt: Date

    init(id: UUID = UUID(), name: String, colorIndex: Int = 0, createdAt: Date = Date()) {
        self.id = id
        self.name = name
        self.colorIndex = colorIndex
        self.createdAt = createdAt
    }

    var color: Color { Theme.goalColor(colorIndex) }
}
