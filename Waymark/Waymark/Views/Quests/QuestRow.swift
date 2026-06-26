import SwiftUI

/// A quest as a card with its tasks inline — check them off, add new ones, or open
/// the editor (tap the name) to change importance / deadline / delete.
struct QuestCard: View {
    @EnvironmentObject var store: DataStore
    let quest: Quest
    let onEdit: () -> Void

    @State private var newTask = ""
    @State private var hovering = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 10) {
                Button(action: onEdit) {
                    Text(quest.name).font(Theme.titleM)
                        .foregroundStyle(quest.isDone ? Theme.inkFaint : Theme.ink)
                        .strikethrough(quest.isDone, color: Theme.inkFaint)
                }.buttonStyle(.plain)
                Spacer()
                ImportanceLeaves(importance: quest.importance)
                if quest.deadline.type != .none { DeadlinePill(deadline: quest.deadline) }
            }

            if quest.isDone {
                HStack(spacing: 10) {
                    Label("Completed", systemImage: "flag.checkered").font(Theme.caption).foregroundStyle(Theme.accent)
                    Spacer()
                    Button { store.reopenQuest(quest) } label: { Text("Reopen").font(Theme.caption).foregroundStyle(Theme.inkSoft) }
                        .buttonStyle(.plain)
                }
            } else {
                // Open tasks
                if quest.openTasks.isEmpty {
                    Text("No tasks yet — add one below.").font(Theme.caption).foregroundStyle(Theme.inkFaint)
                } else {
                    VStack(spacing: 8) {
                        ForEach(quest.openTasks) { task in
                            HStack(spacing: 10) {
                                Button {
                                    withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) { store.completeTask(task, in: quest) }
                                } label: { Image(systemName: "circle").font(.system(size: 15)).foregroundStyle(Theme.inkFaint) }
                                    .buttonStyle(.plain)
                                Text(task.title).font(Theme.body).foregroundStyle(Theme.ink)
                                Spacer()
                                if hovering {
                                    Button { store.deleteTask(task, in: quest) } label: {
                                        Image(systemName: "xmark").font(.system(size: 9)).foregroundStyle(Theme.inkFaint)
                                    }.buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }

                // Add task + complete quest
                HStack(spacing: 8) {
                    TextField("Add a task…", text: $newTask)
                        .textFieldStyle(.plain).font(Theme.caption).foregroundStyle(Theme.ink)
                        .padding(.horizontal, 11).padding(.vertical, 7)
                        .background(Capsule().fill(Color.white.opacity(0.7)))
                        .overlay(Capsule().strokeBorder(Theme.inkFaint.opacity(0.25), lineWidth: 1))
                        .onSubmit(addTask)
                    Button(action: addTask) { Image(systemName: "plus") }
                        .buttonStyle(.plain).foregroundStyle(Theme.accent)
                        .disabled(newTask.trimmingCharacters(in: .whitespaces).isEmpty)
                    Spacer()
                    Button { store.markQuestDone(quest) } label: {
                        Label("Finish quest", systemImage: "flag.checkered").font(Theme.caption).foregroundStyle(Theme.inkSoft)
                    }.buttonStyle(.plain).help("Mark the whole quest complete")
                }
                .padding(.top, 2)
            }
        }
        .padding(18).glass(strong: hovering)
        .onHover { hovering = $0 }
        .animation(.easeOut(duration: 0.15), value: hovering)
    }

    private func addTask() {
        let t = newTask.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return }
        store.addTask(t, to: quest); newTask = ""
    }
}
