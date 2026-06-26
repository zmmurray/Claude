import SwiftUI

enum QuestFilter: String, CaseIterable, Identifiable {
    case active = "Active", done = "Done", all = "All"
    var id: String { rawValue }
}

struct QuestsView: View {
    @EnvironmentObject var store: DataStore
    @State private var editing: QuestEditorTarget? = nil
    @State private var filter: QuestFilter = .active

    private var shown: [Quest] {
        switch filter {
        case .active: return store.activeQuests
        case .done:   return store.doneQuests
        case .all:    return store.activeQuests + store.doneQuests
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                header
                if store.quests.isEmpty {
                    emptyState
                } else {
                    progressLine
                    filterRow
                    if shown.isEmpty {
                        Text(filter == .done ? "No finished quests yet." : "Nothing here yet.")
                            .font(Theme.body).foregroundStyle(Theme.inkFaint)
                            .padding(.top, 8)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(shown) { quest in
                                QuestRow(quest: quest) { editing = .edit(quest) }
                            }
                        }
                    }
                    if store.hasSampleQuests {
                        Button { withAnimation { store.removeSampleQuests() } } label: {
                            Text("Remove the example quests")
                                .font(Theme.caption).foregroundStyle(Theme.inkFaint).underline()
                        }
                        .buttonStyle(.plain)
                        .padding(.top, 6)
                    }
                }
            }
            .frame(maxWidth: 820, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.horizontal, 44)
            .padding(.vertical, 40)
        }
        .scrollIndicators(.hidden)
        .sheet(item: $editing) { target in
            QuestEditorSheet(existing: target.quest).environmentObject(store)
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

    @ViewBuilder
    private var progressLine: some View {
        let week = store.weeklyProgressCount
        let done = store.completedQuestCount
        if week > 0 || done > 0 {
            HStack(spacing: 7) {
                Image(systemName: "leaf.fill").font(.system(size: 11)).foregroundStyle(Theme.moss)
                Text(progressText(week: week, done: done))
                    .font(Theme.caption).foregroundStyle(Theme.inkSoft)
            }
        }
    }

    private func progressText(week: Int, done: Int) -> String {
        var bits: [String] = []
        if week > 0 { bits.append("\(week) step\(week == 1 ? "" : "s") moved this week") }
        if done > 0 { bits.append("\(done) quest\(done == 1 ? "" : "s") complete") }
        return bits.joined(separator: " · ")
    }

    private var filterRow: some View {
        HStack(spacing: 8) {
            ForEach(QuestFilter.allCases) { f in
                let selected = filter == f
                Button { filter = f } label: {
                    Text(f.rawValue)
                        .font(Theme.caption)
                        .foregroundStyle(selected ? .white : Theme.inkSoft)
                        .padding(.horizontal, 13).padding(.vertical, 6)
                        .background(Capsule().fill(selected ? Theme.accent : Theme.surface))
                        .overlay(Capsule().strokeBorder(selected ? .clear : Theme.hairline, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("No quests yet.").font(Theme.titleM).foregroundStyle(Theme.ink)
            Text("Add your first project. All it really needs is a name and one concrete next step.")
                .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
            HStack(spacing: 12) {
                Button { editing = .new } label: { Label("New quest", systemImage: "plus") }
                    .buttonStyle(PrimaryActionButtonStyle())
                Button { withAnimation { store.loadSampleQuests() } } label: {
                    Text("or add examples").font(Theme.bodyMed).foregroundStyle(Theme.accent)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(24).card()
    }
}

/// Sheet routing target so "new" and "edit" share one sheet binding.
enum QuestEditorTarget: Identifiable {
    case new
    case edit(Quest)
    var id: String {
        switch self {
        case .new: return "new"
        case .edit(let q): return q.id.uuidString
        }
    }
    var quest: Quest? {
        switch self {
        case .new: return nil
        case .edit(let q): return q
        }
    }
}
