import Foundation

/// The whole persisted world: quests, the meaningful-progress log, and the date the
/// day was last declared "enough." Codable → JSON on disk.
struct AppData: Codable {
    var quests: [Quest]
    var events: [ProgressEvent]
    /// The day the important thing was done (or the day was consciously called).
    /// When this is today, the Today view rests instead of dangling more work.
    var enoughDate: Date?
    var schemaVersion: Int

    static let currentSchemaVersion = 1

    init(quests: [Quest] = [], events: [ProgressEvent] = [], enoughDate: Date? = nil) {
        self.quests = quests
        self.events = events
        self.enoughDate = enoughDate
        self.schemaVersion = AppData.currentSchemaVersion
    }

    /// Forgiving decode: tolerate older/partial files so a hand-edit never bricks launch.
    enum CodingKeys: String, CodingKey { case quests, events, enoughDate, schemaVersion }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        quests = (try? c.decode([Quest].self, forKey: .quests)) ?? []
        events = (try? c.decode([ProgressEvent].self, forKey: .events)) ?? []
        enoughDate = try? c.decodeIfPresent(Date.self, forKey: .enoughDate)
        schemaVersion = (try? c.decode(Int.self, forKey: .schemaVersion)) ?? AppData.currentSchemaVersion
    }
}
