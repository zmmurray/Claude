import Foundation

/// One quest, scored for today, with a plain-sentence reason you can trust.
struct RankedQuest: Identifiable {
    let quest: Quest
    let score: Double
    let reason: String
    var id: UUID { quest.id }
}

/// The ranking engine. It blends deadline *urgency* with *importance* — never task
/// count, never "what's quickest to clear." It returns a SHORT list on purpose:
/// overwhelm is failure.
enum Ranking {

    private static let importanceInfluence: Double = 0.58
    private static let urgencyInfluence: Double = 0.42
    private static let horizonDays: Double = 30

    /// 0...1 from the 1–5 importance.
    static func importanceScore(_ importance: Int) -> Double {
        Double(min(5, max(1, importance)) - 1) / 4.0
    }

    /// 0...~1.2 urgency. Hard deadlines weigh full; soft, half; none, almost nothing.
    static func urgencyScore(_ deadline: Deadline, now: Date = Date()) -> Double {
        let typeMultiplier: Double
        switch deadline.type {
        case .hard: typeMultiplier = 1.0
        case .soft: typeMultiplier = 0.5
        case .none: return 0.04
        }
        guard let days = deadline.daysFromNow(now) else {
            return 0.30 * typeMultiplier
        }
        if days < 0 {
            return (1.0 + min(0.2, Double(-days) / 100.0)) * typeMultiplier
        }
        let closeness = max(0, 1 - Double(days) / horizonDays)
        return closeness * typeMultiplier
    }

    static func score(_ quest: Quest, now: Date = Date()) -> Double {
        importanceInfluence * importanceScore(quest.importance)
            + urgencyInfluence * urgencyScore(quest.deadline, now: now)
    }

    /// A single trustworthy sentence explaining the rank.
    static func reason(for quest: Quest, now: Date = Date()) -> String {
        var parts: [String] = []

        if quest.deadline.type != .none {
            let kind = quest.deadline.type == .hard ? "Hard" : "Soft"
            if let days = quest.deadline.daysFromNow(now) {
                if days < 0 {
                    parts.append("\(kind) deadline \(abs(days))d overdue")
                } else if days == 0 {
                    parts.append("\(kind) deadline today")
                } else if days == 1 {
                    parts.append("\(kind) deadline tomorrow")
                } else {
                    parts.append("\(kind) deadline in \(days) days")
                }
            } else {
                parts.append("\(kind) deadline set")
            }
        }

        switch quest.importance {
        case 5: parts.append("very important to you")
        case 4: parts.append("important to you")
        case 3: parts.append("matters to you")
        default: break
        }

        if parts.isEmpty {
            return "Quietly worth a little attention today."
        }
        let sentence = parts.joined(separator: " + ")
        return sentence.prefix(1).uppercased() + sentence.dropFirst() + "."
    }

    /// Today's focus: the few quests that deserve the day. Always the single most
    /// important actionable quest; runners-up only if genuinely comparable, capped low.
    static func todaysFocus(_ quests: [Quest], now: Date = Date(), maxItems: Int = 3) -> [RankedQuest] {
        let ranked = quests
            .filter { $0.isActionable }
            .map { RankedQuest(quest: $0, score: score($0, now: now), reason: reason(for: $0, now: now)) }
            .sorted { $0.score > $1.score }

        guard let leader = ranked.first else { return [] }
        let cutoff = leader.score * 0.62
        var result = [leader]
        for item in ranked.dropFirst() where result.count < maxItems && item.score >= cutoff {
            result.append(item)
        }
        return result
    }

    /// Important quests stuck because they lack a concrete next step.
    static func needsNextStep(_ quests: [Quest]) -> [Quest] {
        quests
            .filter { !$0.isDone && !$0.hasNextStep && $0.importance >= 4 }
            .sorted { $0.importance > $1.importance }
    }
}
