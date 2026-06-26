import SwiftUI

/// One focus item. The NEXT STEP is the hero — large and clear. The quest name is
/// quiet context above it. The reason sits below so the ranking feels trustworthy.
struct FocusCard: View {
    @EnvironmentObject var store: DataStore
    let ranked: RankedQuest
    let isLeader: Bool

    @State private var completing = false

    private var quest: Quest { ranked.quest }

    var body: some View {
        VStack(alignment: .leading, spacing: isLeader ? 18 : 12) {
            // Context row
            HStack(spacing: 10) {
                Text(quest.name)
                    .font(Theme.label)
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(1)
                Spacer()
                DeadlinePill(deadline: quest.deadline)
            }

            // The hero: the concrete next step
            Text(quest.nextStep)
                .font(Theme.display(isLeader ? 28 : 19, weight: .semibold))
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)

            // Reason
            if isLeader {
                HStack(spacing: 7) {
                    Image(systemName: "sparkles").font(.system(size: 10)).foregroundStyle(Theme.moss)
                    Text(ranked.reason).font(Theme.caption).foregroundStyle(Theme.inkSoft)
                }
            }

            if isLeader { Divider().overlay(Theme.hairline) }

            // Actions
            HStack(spacing: 12) {
                Button { complete() } label: {
                    Label("Mark it done", systemImage: "checkmark")
                }
                .buttonStyle(PrimaryActionButtonStyle(big: isLeader))

                if isLeader, let next = quest.stage.next {
                    Button {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) { store.advanceStage(quest) }
                    } label: {
                        Label("Move to \(next.title)", systemImage: "arrow.forward")
                    }
                    .buttonStyle(QuietButtonStyle())
                }

                Spacer()
                if isLeader { StageIndicator(stage: quest.stage) }
            }
        }
        .padding(isLeader ? 24 : 16)
        .card(raised: isLeader, accentEdge: isLeader ? Theme.accent.opacity(0.35) : nil)
        .scaleEffect(completing ? 0.99 : 1)
        .opacity(completing ? 0.0 : 1)
    }

    private func complete() {
        withAnimation(.easeIn(duration: 0.26)) { completing = true }
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 280_000_000)
            withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                store.completeNextStep(quest)
            }
        }
    }
}
