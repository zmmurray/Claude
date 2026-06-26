import SwiftUI

struct QuestRow: View {
    @EnvironmentObject var store: DataStore
    let quest: Quest
    let onEdit: () -> Void

    @State private var hovering = false

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // Axis spine
            RoundedRectangle(cornerRadius: 2)
                .fill(quest.axis.color.opacity(quest.isDone ? 0.4 : 0.9))
                .frame(width: 3)
                .frame(maxHeight: .infinity)

            VStack(alignment: .leading, spacing: 9) {
                HStack(spacing: 10) {
                    Text(quest.name)
                        .font(Theme.bodyMed)
                        .foregroundStyle(quest.isDone ? Theme.inkFaint : Theme.ink)
                        .strikethrough(quest.isDone, color: Theme.inkFaint)
                    AxisChip(axis: quest.axis)
                    Spacer()
                    WeightDots(weight: quest.strategicWeight)
                }

                // The next action — always surfaced.
                if quest.isDone {
                    Label("Done", systemImage: "checkmark.seal")
                        .font(Theme.caption).foregroundStyle(Theme.inkFaint)
                } else if quest.hasNextAction {
                    HStack(spacing: 7) {
                        Image(systemName: "arrow.right")
                            .font(.system(size: 10)).foregroundStyle(Theme.accent.opacity(0.8))
                        Text(quest.nextAction)
                            .font(Theme.body).foregroundStyle(Theme.inkSoft)
                    }
                } else {
                    Text("No next step yet")
                        .font(Theme.caption).foregroundStyle(Theme.accent.opacity(0.85))
                }

                HStack(spacing: 14) {
                    StageIndicator(stage: quest.stage, tint: quest.axis.color)
                    DeadlinePill(deadline: quest.deadline)
                    Spacer()
                    if hovering && !quest.isDone {
                        quickActions
                    }
                }
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
        HStack(spacing: 8) {
            if quest.hasNextAction {
                Button {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                        store.completeNextAction(quest)
                    }
                } label: {
                    Image(systemName: "checkmark").font(.system(size: 11, weight: .semibold))
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.accent)
                .help("Complete this step")
            }
            if let next = quest.stage.next {
                Button {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                        store.advanceStage(quest)
                    }
                } label: {
                    Image(systemName: "arrow.up.right").font(.system(size: 11, weight: .semibold))
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.inkSoft)
                .help("Advance to \(next.title)")
            }
            Button(action: onEdit) {
                Image(systemName: "pencil").font(.system(size: 11, weight: .semibold))
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.inkSoft)
            .help("Edit quest")
        }
    }
}
