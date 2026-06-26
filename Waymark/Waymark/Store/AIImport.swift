import Foundation

/// "Set up with AI" (Option A): the user pastes a prompt into their own ChatGPT/Claude,
/// which already knows their world, and pastes the JSON reply back. No API key, no
/// network — Waymark just parses the structured reply into quests and tasks.
enum AIImport {

    static let prompt = """
    You are helping me set up an app called Waymark.

    Definitions:
    - A QUEST is a project I'm working on (e.g., "Pelagos — short film", "Kitchen remodel").
    - A TASK is a small, concrete to-do inside a quest (e.g., "Render shot 14").

    Using everything you know about my projects and work, produce my setup.

    Output ONLY valid JSON — no commentary, no markdown code fences — in EXACTLY this shape:

    {
      "quests": [
        {
          "name": "string",
          "importance": 3,
          "deadlineType": "none",
          "deadline": "",
          "tasks": ["first small to-do", "another to-do"]
        }
      ]
    }

    Rules:
    - Add as many quests as make sense.
    - importance is an integer 1–5 (5 = most important to me).
    - deadlineType is one of: "none", "soft", "hard".
    - deadline is "YYYY-MM-DD" when there's a date, otherwise "".
    - tasks is a list of small, doable to-dos (2–6 per quest is ideal).

    Output the JSON now.
    """

    struct Payload: Decodable { var quests: [QuestIn]? }
    struct QuestIn: Decodable {
        var name: String
        var importance: Int?
        var deadlineType: String?
        var deadline: String?
        var tasks: [String]?
    }

    static func parse(_ raw: String) throws -> Payload {
        guard let start = raw.firstIndex(of: "{"), let end = raw.lastIndex(of: "}"), start < end else {
            throw ImportError.noJSON
        }
        let slice = String(raw[start...end])
        guard let data = slice.data(using: .utf8) else { throw ImportError.noJSON }
        do { return try JSONDecoder().decode(Payload.self, from: data) }
        catch { throw ImportError.badJSON }
    }

    enum ImportError: LocalizedError {
        case noJSON, badJSON, empty
        var errorDescription: String? {
            switch self {
            case .noJSON: return "I couldn't find any JSON in what you pasted. Paste the full reply from your assistant."
            case .badJSON: return "That JSON didn't match the expected format. Ask your assistant to output only the JSON, exactly as the prompt shows."
            case .empty: return "The reply didn't contain any quests."
            }
        }
    }

    static func deadlineType(from s: String?) -> DeadlineType {
        switch (s ?? "").lowercased() {
        case "hard": return .hard
        case "soft", "target": return .soft
        default: return .none
        }
    }
    static func date(from s: String?) -> Date? {
        guard let s, !s.isEmpty else { return nil }
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"; f.locale = Locale(identifier: "en_US_POSIX")
        return f.date(from: s)
    }
}
