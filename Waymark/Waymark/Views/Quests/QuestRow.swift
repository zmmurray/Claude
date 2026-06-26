import SwiftUI

struct QuestRow: View {
    @EnvironmentObject var store: DataStore
    let quest: Quest
    let onEdit: () -> Void

    @State private var hovering = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Text(quest.name)
                    .font(Theme.bodyMed)
                    .foregroundStyle(quest.isDone ? Theme.inkFaint : Theme.ink)
                    .strikethrough(quest.isDone, color: Theme.inkFaint)
                Spacer()
                ImportanceLeaves(importance: quest.importance)
            }

            // The next step — always surfaced.
            if quest.isDone {
                Label("Complete", systemImage: "checkmark.seal.fill")
                    .font(Theme.caption).foregroundStyle(Theme.moss)
            } else if quest.hasNextStep {
                HStack(spacing: 7) {
                    Image(systemName: "arrow.forward").font(.system(size: 10)).foregroundStyle(Theme.accent)
                    Text(quest.nextStep).font(Theme.body).foregroundStyle(Theme.inkSoft)
                }
            } else {
                Text("No next step yet — tap to add one")
                    .font(Theme.caption).foregroundStyle(Theme.urgent.opacity(0.9))
            }

            HStack(spacing: 14) {
                StageIndicator(stage: quest.stage)
                DeadlinePill(deadline: quest.deadline)
                Spacer()
                if hovering && !quest.isDone { quickActions }
            }
        }
        .padding(16)
        .card(raised: hovering)
        .contentShape(Rectangle())
        .onTapGesture(perform: onEdit)
        .onHover { hovering = $0 }
        .animation(.easeOut(duration: 0.15), value: hovering)
    }

    @ViewBuilder
    private var quickActions: some View {
        HStack(spacing: 10) {
            if quest.hasNextStep {
                Button {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) { store.completeNextStep(quest) }
                } label: { Image(systemName: "checkmark").font(.system(size: 11, weight: .semibold)) }
                .buttonStyle(.plain).foregroundStyle(Theme.accent)
                .help("Mark this step done")
            }
            if let next = quest.stage.next {
                Button {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) { store.advanceStage(quest) }
                } label: { Image(systemName: "arrow.forward").font(.system(size: 11, weight: .semibold)) }
                .buttonStyle(.plain).foregroundStyle(Theme.inkSoft)
                .help("Move to \(next.title)")
            }
            Button(action: onEdit) {
                Image(systemName: "pencil").font(.system(size: 11, weight: .semibold))
            }
            .buttonStyle(.plain).foregroundStyle(Theme.inkSoft)
            .help("Edit quest")
        }
    }
}
