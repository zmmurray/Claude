import Foundation

/// "Set up with AI" (Option A): the user pastes a prompt into their own ChatGPT/Claude,
/// then pastes the reply back. To be forgiving, we accept a simple "Quest:/- task" list
/// (what people and assistants naturally write) AND raw JSON. No API key, no network.
enum AIImport {

    static let prompt = """
    Help me set up my projects in an app called Waymark.

    A QUEST is a project I'm working on. Under each quest are small TASKS (to-dos).

    Based on what you know about my work and projects, list them in EXACTLY this format —
    a "Quest:" line for each project, then a "- " line for each small task:

    Quest: Pelagos — short film
    - Render shot 14
    - Send the festival submission email

    Quest: Client brand reel
    - Lock the music selects

    Keep each task small and concrete (something I could start now). If you're not sure
    what I'm working on, ask me first, then produce the list. Output only the list.
    """

    /// A quest ready to import.
    struct ParsedQuest {
        var name: String
        var importance: Int = 3
        var deadlineType: DeadlineType = .none
        var deadlineDate: Date? = nil
        var tasks: [String] = []
    }

    enum ImportError: LocalizedError {
        case empty
        var errorDescription: String? {
            "I couldn't find any quests in that. Make sure the reply has a line like \"Quest: My project\" with \"- task\" lines under it, then paste it again."
        }
    }

    /// Parse the reply: prefer JSON if present, otherwise read the plain list.
    static func parse(_ raw: String) throws -> [ParsedQuest] {
        if let json = parseJSON(raw), !json.isEmpty { return json }
        let plain = parsePlain(raw)
        if plain.isEmpty { throw ImportError.empty }
        return plain
    }

    // MARK: JSON path (optional convenience)

    private struct Payload: Decodable { var quests: [QuestIn]? }
    private struct QuestIn: Decodable {
        var name: String
        var importance: Int?
        var deadlineType: String?
        var deadline: String?
        var tasks: [String]?
    }

    private static func parseJSON(_ raw: String) -> [ParsedQuest]? {
        guard let start = raw.firstIndex(of: "{"), let end = raw.lastIndex(of: "}"), start < end else { return nil }
        let slice = String(raw[start...end])
        guard let data = slice.data(using: .utf8),
              let payload = try? JSONDecoder().decode(Payload.self, from: data),
              let quests = payload.quests else { return nil }
        return quests.compactMap { q in
            let name = q.name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !name.isEmpty else { return nil }
            let dt = deadlineType(from: q.deadlineType)
            return ParsedQuest(
                name: name,
                importance: min(5, max(1, q.importance ?? 3)),
                deadlineType: dt,
                deadlineDate: dt == .none ? nil : date(from: q.deadline),
                tasks: (q.tasks ?? []).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
            )
        }
    }

    // MARK: Plain-list path (the forgiving default)

    private static func parsePlain(_ raw: String) -> [ParsedQuest] {
        let lines = raw.split(separator: "\n", omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        var quests: [ParsedQuest] = []
        var current: ParsedQuest?

        for (i, line) in lines.enumerated() {
            if let task = bulletContent(line) {
                if current == nil { current = ParsedQuest(name: "My quests") }
                if !task.isEmpty { current?.tasks.append(task) }
                continue
            }
            // A non-bullet line is a quest only if explicitly marked or directly
            // followed by a task bullet — otherwise it's prose and we skip it.
            let lower = line.lowercased()
            let explicit = ["quest:", "project:", "goal:"].contains { lower.hasPrefix($0) }
                || line.hasPrefix("#") || line.hasPrefix("**")
            let nextIsBullet = i + 1 < lines.count && bulletContent(lines[i + 1]) != nil
            if explicit || nextIsBullet {
                if let c = current { quests.append(c) }
                current = ParsedQuest(name: cleanHeader(line))
            }
        }
        if let c = current { quests.append(c) }

        // Drop empties and a leading auto "My quests" that never collected tasks.
        return quests.filter { !$0.name.isEmpty && !($0.name == "My quests" && $0.tasks.isEmpty) }
    }

    /// If the line is a task bullet, return its text; otherwise nil.
    private static func bulletContent(_ line: String) -> String? {
        let markers = ["- ", "* ", "• ", "– ", "— ", "‣ ", "● ", "·  ", "[ ] ", "[] "]
        for m in markers where line.hasPrefix(m) {
            return stripCheckbox(String(line.dropFirst(m.count)))
        }
        // Numbered: "1. ", "2) "
        var idx = line.startIndex
        while idx < line.endIndex, line[idx].isNumber { idx = line.index(after: idx) }
        if idx > line.startIndex, idx < line.endIndex, line[idx] == "." || line[idx] == ")" {
            let after = line.index(after: idx)
            if after <= line.endIndex {
                return stripCheckbox(String(line[after...]).trimmingCharacters(in: .whitespaces))
            }
        }
        return nil
    }

    private static func stripCheckbox(_ s: String) -> String {
        var t = s.trimmingCharacters(in: .whitespaces)
        for box in ["[ ] ", "[] ", "[x] ", "[X] "] where t.hasPrefix(box) { t = String(t.dropFirst(box.count)) }
        return t.trimmingCharacters(in: .whitespaces)
    }

    /// Clean a quest header line of markdown and "Quest:/Project:" prefixes.
    private static func cleanHeader(_ line: String) -> String {
        var t = line.trimmingCharacters(in: CharacterSet(charactersIn: "#*_ \t"))
        for prefix in ["quest:", "project:", "goal:"] where t.lowercased().hasPrefix(prefix) {
            t = String(t.dropFirst(prefix.count))
        }
        t = t.trimmingCharacters(in: CharacterSet(charactersIn: "*_: \t"))
        return t
    }

    // MARK: Shared helpers

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
