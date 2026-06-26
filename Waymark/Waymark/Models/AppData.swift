import Foundation

/// The whole persisted world: quests (each holding tasks), the progress log, the
/// day's "enough" marker, an optional background image, and whether the intro is done.
struct AppData: Codable {
    var quests: [Quest]
    var events: [ProgressEvent]
    var enoughDate: Date?
    var onboardingComplete: Bool
    var backgroundImageName: String?
    var schemaVersion: Int

    static let currentSchemaVersion = 4

    init(quests: [Quest] = [], events: [ProgressEvent] = [], enoughDate: Date? = nil,
         onboardingComplete: Bool = false, backgroundImageName: String? = nil) {
        self.quests = quests
        self.events = events
        self.enoughDate = enoughDate
        self.onboardingComplete = onboardingComplete
        self.backgroundImageName = backgroundImageName
        self.schemaVersion = AppData.currentSchemaVersion
    }

    enum CodingKeys: String, CodingKey {
        case quests, events, enoughDate, onboardingComplete, backgroundImageName, schemaVersion
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        quests = (try? c.decode([Quest].self, forKey: .quests)) ?? []
        events = (try? c.decode([ProgressEvent].self, forKey: .events)) ?? []
        enoughDate = try? c.decodeIfPresent(Date.self, forKey: .enoughDate)
        onboardingComplete = (try? c.decode(Bool.self, forKey: .onboardingComplete)) ?? false
        backgroundImageName = try? c.decodeIfPresent(String.self, forKey: .backgroundImageName)
        schemaVersion = (try? c.decode(Int.self, forKey: .schemaVersion)) ?? 0
    }
}
