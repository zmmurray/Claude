import SwiftUI

struct QuestsView: View {
    @EnvironmentObject var store: DataStore
    @State private var editing: QuestEditorTarget? = nil
    @State private var axisFilter: StrategicAxis? = nil

    private var sorted: [Quest] {
        store.quests.sorted { a, b in
            if a.isDone != b.isDone { return !a.isDone } // active above done
            return Ranking.score(a) > Ranking.score(b)
        }
    }

    private var filtered: [Quest] {
        guard let axisFilter else { return sorted }
        return sorted.filter { $0.axis == axisFilter }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.gutter) {
                header
                if store.quests.isEmpty {
                    emptyState
                } else {
                    filterRow
                    VStack(spacing: 12) {
                        ForEach(filtered) { quest in
                            QuestRow(quest: quest) { editing = .edit(quest) }
                        }
                    }
                }
            }
            .frame(maxWidth: 860, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.horizontal, 48)
            .padding(.vertical, 44)
        }
        .scrollIndicators(.hidden)
        .sheet(item: $editing) { target in
            QuestEditorSheet(existing: target.quest).environmentObject(store)
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            SectionHeader(title: "Quests", eyebrow: "Every project you're carrying")
            Spacer()
            Button { editing = .new } label: {
                Label("New quest", systemImage: "plus")
            }
            .buttonStyle(PrimaryActionButtonStyle())
        }
    }

    private var filterRow: some View {
        HStack(spacing: 8) {
            chip(title: "All", color: Theme.inkSoft, selected: axisFilter == nil) { axisFilter = nil }
            ForEach(StrategicAxis.allCases) { a in
                chip(title: a.shortName, color: a.color, selected: axisFilter == a) {
                    axisFilter = (axisFilter == a) ? nil : a
                }
            }
        }
    }

    private func chip(title: String, color: Color, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Circle().fill(color).frame(width: 6, height: 6)
                Text(title).font(Theme.caption)
            }
            .foregroundStyle(selected ? Theme.ink : Theme.inkSoft)
            .padding(.horizontal, 11).padding(.vertical, 6)
            .background(Capsule().fill(selected ? Theme.surfaceHi : .clear))
            .overlay(Capsule().strokeBorder(selected ? Theme.hairlineHi : Theme.hairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("No quests yet.").font(Theme.titleM).foregroundStyle(Theme.ink)
            Text("Add your first project — give it an axis, a weight, a stage, and most importantly a single concrete next step.")
                .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
            HStack(spacing: 12) {
                Button { editing = .new } label: { Label("New quest", systemImage: "plus") }
                    .buttonStyle(PrimaryActionButtonStyle())
                Button { withAnimation { store.loadSampleQuests() } } label: {
                    Label("Add examples", systemImage: "wand.and.stars")
                }
                .buttonStyle(QuietButtonStyle())
            }
        }
        .padding(28).card()
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
