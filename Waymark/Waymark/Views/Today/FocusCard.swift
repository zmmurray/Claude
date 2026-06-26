import SwiftUI

/// The single focal task. The task is the hero; the quest is quiet context; the reason
/// builds trust. One primary action: mark it done.
struct FocusCard: View {
    @EnvironmentObject var store: DataStore
    let ranked: RankedTask
    @State private var completing = false

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 10) {
                Image(systemName: "flag.fill").font(.system(size: 10)).foregroundStyle(Theme.accent)
                Text(ranked.quest.name).font(Theme.label).foregroundStyle(Theme.inkSoft).lineLimit(1)
                Spacer()
                DeadlinePill(deadline: ranked.quest.deadline)
            }

            Text(ranked.task.title)
                .font(Theme.display(30, weight: .semibold)).foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 7) {
                Image(systemName: "sparkles").font(.system(size: 11)).foregroundStyle(Theme.accent)
                Text(ranked.reason).font(Theme.caption).foregroundStyle(Theme.inkSoft)
            }

            Divider().overlay(Color.white.opacity(0.5))

            HStack(spacing: 12) {
                Button { complete() } label: { Label("Mark it done", systemImage: "checkmark") }
                    .buttonStyle(PrimaryActionButtonStyle(big: true))
                Spacer()
                ImportanceLeaves(importance: ranked.quest.importance)
            }
        }
        .padding(26)
        .glass(strong: true, accentEdge: Theme.accent.opacity(0.30))
        .scaleEffect(completing ? 0.99 : 1)
        .opacity(completing ? 0 : 1)
    }

    private func complete() {
        withAnimation(.easeIn(duration: 0.26)) { completing = true }
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 280_000_000)
            withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                store.completeTask(ranked.task, in: ranked.quest)
            }
        }
    }
}
