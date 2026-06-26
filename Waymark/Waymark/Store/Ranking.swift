import Foundation

/// One quest, scored for today, with a plain-sentence reason I can trust.
struct RankedQuest: Identifiable {
    let quest: Quest
    let score: Double
    let reason: String
    var id: UUID { quest.id }
}

/// The ranking engine. It blends deadline *urgency* with *strategic weight* —
/// never task count, never "what's quickest to clear." Importance only.
/// It deliberately returns a SHORT list: overwhelm is failure.
enum Ranking {

    /// Tunables. Strategic weight is the primary lens; urgency makes things
    /// *today*-relevant. Both matter; weight leads.
    private static let weightInfluence: Double = 0.58
    private static let urgencyInfluence: Double = 0.42
    /// Horizon over which a deadline ramps from "distant" to "now."
    private static let horizonDays: Double = 30

    /// 0...1 from the 1–5 strategic weight.
    static func weightScore(_ weight: Int) -> Double {
        Double(min(5, max(1, weight)) - 1) / 4.0
    }

    /// 0...~1.2 urgency. Hard deadlines weigh full; soft, half; none, almost nothing.
    /// Overdue items push slightly past 1 so they surface first.
    static func urgencyScore(_ deadline: Deadline, now: Date = Date()) -> Double {
        let typeMultiplier: Double
        switch deadline.type {
        case .hard: typeMultiplier = 1.0
        case .soft: typeMultiplier = 0.5
        case .none: return 0.04 // a whisper, so weight alone can still rank it
        }
        guard let days = deadline.daysFromNow(now) else {
            // typed deadline with no date set: mild standing pressure
            return 0.30 * typeMultiplier
        }
        if days < 0 {
            return (1.0 + min(0.2, Double(-days) / 100.0)) * typeMultiplier // overdue
        }
        let closeness = max(0, 1 - Double(days) / horizonDays)
        return closeness * typeMultiplier
    }

    static func score(_ quest: Quest, now: Date = Date()) -> Double {
        weightInfluence * weightScore(quest.strategicWeight)
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

        switch quest.strategicWeight {
        case 5: parts.append("top strategic weight")
        case 4: parts.append("high strategic weight")
        case 3: parts.append("solid strategic weight")
        default: break // low weight only mentioned if it's all there is
        }

        if parts.isEmpty {
            // low weight, no deadline — it rose only because little else competes
            return "Quietly worth a little attention today."
        }
        // Capitalize the joined sentence cleanly.
        let sentence = parts.joined(separator: " + ")
        return sentence.prefix(1).uppercased() + sentence.dropFirst() + "."
    }

    /// Today's focus: the few quests that deserve the day.
    /// - Always includes the single most important actionable quest.
    /// - Includes runners-up ONLY if they're genuinely comparable to the leader,
    ///   and never more than `maxItems`. When one thing dominates, the list is one item.
    static func todaysFocus(_ quests: [Quest], now: Date = Date(), maxItems: Int = 3) -> [RankedQuest] {
        let ranked = quests
            .filter { $0.isActionable }
            .map { RankedQuest(quest: $0, score: score($0, now: now), reason: reason(for: $0, now: now)) }
            .sorted { $0.score > $1.score }

        guard let leader = ranked.first else { return [] }
        // Relative threshold keeps the list short unless others are nearly as important.
        let cutoff = leader.score * 0.62
        var result = [leader]
        for item in ranked.dropFirst() where result.count < maxItems && item.score >= cutoff {
            result.append(item)
        }
        return result
    }

    /// High-weight quests that are stuck because they lack a concrete next step.
    /// Naming the step is what turns a paralyzing project into a doable one.
    static func needsNextStep(_ quests: [Quest]) -> [Quest] {
        quests
            .filter { !$0.isDone && !$0.hasNextAction && $0.strategicWeight >= 4 }
            .sorted { $0.strategicWeight > $1.strategicWeight }
    }
}
