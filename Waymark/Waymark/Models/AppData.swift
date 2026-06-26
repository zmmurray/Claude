import Foundation

/// The whole persisted world: life goals, quests, the meaningful-progress log, the
/// day's "enough" marker, an optional background image, and whether the guided
/// first-run is done. Codable → JSON on disk.
struct AppData: Codable {
    var goals: [Goal]
    var quests: [Quest]
    var events: [ProgressEvent]
    var enoughDate: Date?
    var onboardingComplete: Bool
    /// Filename (within the app-support Backgrounds folder) of a chosen backdrop.
    var backgroundImageName: String?
    var schemaVersion: Int

    static let currentSchemaVersion = 2

    init(goals: [Goal] = [], quests: [Quest] = [], events: [ProgressEvent] = [],
         enoughDate: Date? = nil, onboardingComplete: Bool = false,
         backgroundImageName: String? = nil) {
        self.goals = goals
        self.quests = quests
        self.events = events
        self.enoughDate = enoughDate
        self.onboardingComplete = onboardingComplete
        self.backgroundImageName = backgroundImageName
        self.schemaVersion = AppData.currentSchemaVersion
    }

    enum CodingKeys: String, CodingKey {
        case goals, quests, events, enoughDate, onboardingComplete, backgroundImageName, schemaVersion
    }

    /// Forgiving decode so a hand-edit or older file never bricks launch.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        goals = (try? c.decode([Goal].self, forKey: .goals)) ?? []
        quests = (try? c.decode([Quest].self, forKey: .quests)) ?? []
        events = (try? c.decode([ProgressEvent].self, forKey: .events)) ?? []
        enoughDate = try? c.decodeIfPresent(Date.self, forKey: .enoughDate)
        onboardingComplete = (try? c.decode(Bool.self, forKey: .onboardingComplete)) ?? false
        backgroundImageName = try? c.decodeIfPresent(String.self, forKey: .backgroundImageName)
        schemaVersion = (try? c.decode(Int.self, forKey: .schemaVersion)) ?? AppData.currentSchemaVersion
    }
}
