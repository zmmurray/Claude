import SwiftUI

struct QuestsView: View {
    @EnvironmentObject var store: DataStore
    @State private var editing: QuestEditorTarget? = nil
    @State private var showDone = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                header
                if store.quests.isEmpty {
                    emptyState
                } else {
                    progressLine
                    // Active quests grouped by goal
                    ForEach(store.goals) { goal in
                        let qs = store.quests(forGoal: goal.id)
                        if !qs.isEmpty { group(title: goal.name, color: goal.color, quests: qs) }
                    }
                    let unsorted = store.quests(forGoal: nil)
                    if !unsorted.isEmpty { group(title: "Unsorted", color: Theme.inkFaint, quests: unsorted) }

                    if !store.doneQuests.isEmpty {
                        Button { withAnimation { showDone.toggle() } } label: {
                            Label(showDone ? "Hide finished" : "Show finished (\(store.doneQuests.count))",
                                  systemImage: showDone ? "chevron.up" : "chevron.down")
                                .font(Theme.caption).foregroundStyle(Theme.inkFaint)
                        }.buttonStyle(.plain).padding(.top, 6)
                        if showDone {
                            VStack(spacing: 12) {
                                ForEach(store.doneQuests) { q in QuestRow(quest: q) { editing = .edit(q) } }
                            }
                        }
                    }
                }
            }
            .frame(maxWidth: 800, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.horizontal, 44).padding(.top, 54).padding(.bottom, 44)
        }
        .scrollIndicators(.hidden)
        .sheet(item: $editing) { QuestEditorSheet(existing: $0.quest).environmentObject(store) }
    }

    private func group(title: String, color: Color, quests: [Quest]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Circle().fill(color).frame(width: 8, height: 8)
                Text(title).font(Theme.titleM).foregroundStyle(Theme.ink)
            }
            ForEach(quests) { q in QuestRow(quest: q) { editing = .edit(q) } }
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("Quests").font(Theme.titleXL).foregroundStyle(Theme.ink)
            Spacer()
            Button { editing = .new } label: { Label("New quest", systemImage: "plus") }
                .buttonStyle(PrimaryActionButtonStyle())
        }
    }

    @ViewBuilder private var progressLine: some View {
        let week = store.weeklyProgressCount
        if week > 0 {
            HStack(spacing: 7) {
                Image(systemName: "leaf.fill").font(.system(size: 11)).foregroundStyle(Theme.accent)
                Text("\(week) step\(week == 1 ? "" : "s") moved this week")
                    .font(Theme.caption).foregroundStyle(Theme.inkSoft)
            }
        }
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("No quests yet.").font(Theme.titleM).foregroundStyle(Theme.ink)
            Text("Add your first project. All it really needs is a name and one concrete next step.")
                .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
            Button { editing = .new } label: { Label("New quest", systemImage: "plus") }
                .buttonStyle(PrimaryActionButtonStyle())
        }
        .padding(24).glass()
    }
}

enum QuestEditorTarget: Identifiable {
    case new
    case edit(Quest)
    var id: String {
        switch self { case .new: return "new"; case .edit(let q): return q.id.uuidString }
    }
    var quest: Quest? {
        switch self { case .new: return nil; case .edit(let q): return q }
    }
}
