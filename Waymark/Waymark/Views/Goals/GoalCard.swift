import SwiftUI

/// A goal as a growing thing. Tiers advance with meaningful milestones (steps done,
/// stages advanced) — never daily task counts. A quiet "needs you" mark appears when
/// a goal with live quests has gone two weeks without progress.
struct GoalCard: View {
    @EnvironmentObject var store: DataStore
    let goal: Goal

    private var milestones: Int { store.milestones(forGoal: goal.id) }
    private var activeCount: Int { store.quests(forGoal: goal.id).filter { !$0.isDone }.count }
    private var neglected: Bool { store.isNeglected(goal) }

    // Growth tiers
    private static let tiers: [(name: String, need: Int)] = [
        ("Seedling", 3), ("Taking root", 4), ("Growing", 6), ("Flourishing", 8), ("Thriving", 10)
    ]
    private var tierInfo: (name: String, into: Int, need: Int, level: Int) {
        var remaining = milestones, level = 0
        for (i, t) in Self.tiers.enumerated() {
            if remaining < t.need { return (t.name, remaining, t.need, i) }
            remaining -= t.need; level = i + 1
        }
        return ("Thriving", remaining, Self.tiers.last!.need, level)
    }

    private var lastText: String {
        guard let d = store.daysSinceProgress(forGoal: goal.id) else { return "No progress yet" }
        switch d { case 0: return "Advanced today"; case 1: return "Advanced yesterday"; default: return "Last advanced \(d) days ago" }
    }

    var body: some View {
        let tier = tierInfo
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 8) {
                        Circle().fill(goal.color).frame(width: 9, height: 9)
                        Text(goal.name).font(Theme.titleM).foregroundStyle(Theme.ink)
                    }
                    Text(tier.name).font(Theme.caption).foregroundStyle(goal.color)
                }
                Spacer()
                if neglected {
                    HStack(spacing: 5) {
                        Image(systemName: "moon.zzz.fill").font(.system(size: 10))
                        Text("Needs you").font(Theme.caption)
                    }
                    .foregroundStyle(Theme.urgent)
                    .padding(.horizontal, 9).padding(.vertical, 4)
                    .background(Capsule().fill(Theme.urgent.opacity(0.12)))
                }
            }

            // Growth bar toward next tier
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.5))
                    Capsule().fill(LinearGradient(colors: [goal.color.opacity(0.8), goal.color],
                                                  startPoint: .leading, endPoint: .trailing))
                        .frame(width: max(8, geo.size.width * progressFraction(tier)))
                }
            }
            .frame(height: 8)

            HStack {
                Text("\(milestones) milestone\(milestones == 1 ? "" : "s")")
                    .font(Theme.caption).foregroundStyle(Theme.inkFaint)
                Spacer()
                Text("\(activeCount) active quest\(activeCount == 1 ? "" : "s")")
                    .font(Theme.caption).foregroundStyle(Theme.inkFaint)
            }

            Divider().overlay(Color.white.opacity(0.5))
            HStack(spacing: 7) {
                Image(systemName: neglected ? "moon.zzz" : "leaf")
                    .font(.system(size: 11)).foregroundStyle(neglected ? Theme.urgent : goal.color)
                Text(lastText).font(Theme.caption).foregroundStyle(neglected ? Theme.urgent : Theme.inkSoft)
            }
        }
        .padding(20)
        .glass(accentEdge: neglected ? Theme.urgent.opacity(0.3) : nil)
    }

    private func progressFraction(_ tier: (name: String, into: Int, need: Int, level: Int)) -> CGFloat {
        guard tier.need > 0 else { return 1 }
        return min(1, max(0.04, CGFloat(tier.into) / CGFloat(tier.need)))
    }
}
