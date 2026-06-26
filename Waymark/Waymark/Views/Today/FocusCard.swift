import SwiftUI

/// One focus item. The NEXT ACTION is the hero — large and warm. The project name
/// is context above it. The reason sits below so the ranking is trustworthy.
struct FocusCard: View {
    @EnvironmentObject var store: DataStore
    let ranked: RankedQuest
    let isLeader: Bool

    @State private var completing = false

    private var quest: Quest { ranked.quest }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Context row
            HStack(spacing: 10) {
                AxisChip(axis: quest.axis)
                Text(quest.name)
                    .font(Theme.label)
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(1)
                Spacer()
                DeadlinePill(deadline: quest.deadline)
            }

            // The hero: the concrete next action
            HStack(alignment: .top, spacing: 12) {
                if isLeader {
                    Image(systemName: "location.north.line.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Theme.accent)
                        .padding(.top, 3)
                }
                Text(quest.nextAction)
                    .font(Theme.display(isLeader ? 26 : 21, weight: .medium))
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Reason
            HStack(spacing: 7) {
                Image(systemName: "sparkle")
                    .font(.system(size: 9))
                    .foregroundStyle(Theme.accent.opacity(0.8))
                Text(ranked.reason)
                    .font(Theme.caption)
                    .foregroundStyle(Theme.inkSoft)
            }

            Divider().overlay(Theme.hairline)

            // Actions
            HStack(spacing: 12) {
                Button {
                    complete()
                } label: {
                    Label("I did this", systemImage: "checkmark")
                }
                .buttonStyle(PrimaryActionButtonStyle())

                if let next = quest.stage.next {
                    Button {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                            store.advanceStage(quest)
                        }
                    } label: {
                        Label("Advance to \(next.title)", systemImage: "arrow.up.right")
                    }
                    .buttonStyle(QuietButtonStyle())
                }

                Spacer()
                StageIndicator(stage: quest.stage, tint: quest.axis.color)
            }
        }
        .padding(20)
        .card(raised: isLeader, accentEdge: isLeader ? Theme.accent.opacity(0.35) : nil)
        .shadow(color: .black.opacity(isLeader ? 0.28 : 0.16),
                radius: isLeader ? 22 : 12, x: 0, y: isLeader ? 10 : 6)
        .scaleEffect(completing ? 0.99 : 1)
        .opacity(completing ? 0.0 : 1)
    }

    private func complete() {
        // A small, weighty beat before the card settles away.
        withAnimation(.easeIn(duration: 0.28)) { completing = true }
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 300_000_000)
            withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                store.completeNextAction(quest)
            }
        }
    }
}
