import Foundation

/// A task chosen for today, with the quest it belongs to and a plain-sentence reason.
struct RankedTask: Identifiable {
    let quest: Quest
    let task: TaskItem
    let reason: String
    var id: UUID { task.id }
}

/// Decides which tasks deserve today by blending each quest's **importance** with its
/// **deadline urgency**. Never by task count. Returns a SHORT list on purpose.
enum Ranking {
    private static let importanceInfluence: Double = 0.58
    private static let urgencyInfluence: Double = 0.42
    private static let horizonDays: Double = 30

    static func importanceScore(_ importance: Int) -> Double {
        Double(min(5, max(1, importance)) - 1) / 4.0
    }

    static func urgencyScore(_ deadline: Deadline, now: Date = Date()) -> Double {
        let mult: Double
        switch deadline.type {
        case .hard: mult = 1.0
        case .soft: mult = 0.5
        case .none: return 0.04
        }
        guard let days = deadline.daysFromNow(now) else { return 0.30 * mult }
        if days < 0 { return (1.0 + min(0.2, Double(-days) / 100.0)) * mult }
        return max(0, 1 - Double(days) / horizonDays) * mult
    }

    static func score(_ quest: Quest, now: Date = Date()) -> Double {
        importanceInfluence * importanceScore(quest.importance)
            + urgencyInfluence * urgencyScore(quest.deadline, now: now)
    }

    static func reason(for quest: Quest, now: Date = Date()) -> String {
        var parts: [String] = []
        if quest.deadline.type != .none {
            let kind = quest.deadline.type == .hard ? "Hard" : "Soft"
            if let days = quest.deadline.daysFromNow(now) {
                if days < 0 { parts.append("\(kind) deadline \(abs(days))d overdue") }
                else if days == 0 { parts.append("\(kind) deadline today") }
                else if days == 1 { parts.append("\(kind) deadline tomorrow") }
                else { parts.append("\(kind) deadline in \(days) days") }
            } else { parts.append("\(kind) deadline set") }
        }
        switch quest.importance {
        case 5: parts.append("very important to you")
        case 4: parts.append("important to you")
        case 3: parts.append("matters to you")
        default: break
        }
        if parts.isEmpty { return "Quietly worth a little attention today." }
        let s = parts.joined(separator: " + ")
        return s.prefix(1).uppercased() + s.dropFirst() + "."
    }

    /// Today's tasks: the next task from each actionable quest, ranked, kept short.
    static func todaysTasks(_ quests: [Quest], now: Date = Date(), maxItems: Int = 3) -> [RankedTask] {
        let ranked = quests
            .filter { $0.isActionable }
            .compactMap { q -> (Quest, TaskItem, Double)? in
                guard let t = q.nextTask else { return nil }
                return (q, t, score(q, now: now))
            }
            .sorted { $0.2 > $1.2 }

        guard let leader = ranked.first else { return [] }
        let cutoff = leader.2 * 0.62
        var out = [RankedTask(quest: leader.0, task: leader.1, reason: reason(for: leader.0, now: now))]
        for item in ranked.dropFirst() where out.count < maxItems && item.2 >= cutoff {
            out.append(RankedTask(quest: item.0, task: item.1, reason: reason(for: item.0, now: now)))
        }
        return out
    }

    /// Important quests that have no open tasks (so nothing can be surfaced).
    static func needsTask(_ quests: [Quest]) -> [Quest] {
        quests.filter { !$0.isDone && !$0.hasOpenTasks && $0.importance >= 4 }
            .sorted { $0.importance > $1.importance }
    }
}
