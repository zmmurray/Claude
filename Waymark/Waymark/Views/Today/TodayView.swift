import SwiftUI

struct TodayView: View {
    @EnvironmentObject var store: DataStore
    var goToQuests: () -> Void = {}

    @State private var revealMore = false
    @State private var showExtras = false
    @State private var showNewQuest = false
    @State private var editQuest: Quest? = nil

    private var dateLine: String {
        let f = DateFormatter(); f.dateFormat = "EEEE, MMMM d"; return f.string(from: Date())
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                if store.hasDoneEnoughToday {
                    EnoughView(revealMore: $revealMore)
                } else if let lead = store.leadTask {
                    focus(lead)
                } else {
                    quietState
                }
            }
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.horizontal, 44).padding(.top, 54).padding(.bottom, 44)
        }
        .scrollIndicators(.hidden)
        .sheet(isPresented: $showNewQuest) { QuestEditorSheet(existing: nil).environmentObject(store) }
        .sheet(item: $editQuest) { q in QuestEditorSheet(existing: q).environmentObject(store) }
        .animation(.spring(response: 0.5, dampingFraction: 0.85), value: store.hasDoneEnoughToday)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(text: dateLine)
            Text(store.hasDoneEnoughToday ? "Today" : "What matters today")
                .font(Theme.titleL).foregroundStyle(Theme.ink)
        }
        .padding(.bottom, 4)
    }

    @ViewBuilder private func focus(_ lead: RankedTask) -> some View {
        FocusCard(ranked: lead)

        let extras = store.extraTasks
        if !extras.isEmpty {
            if showExtras {
                VStack(spacing: 12) { ForEach(extras) { CompactTaskRow(ranked: $0) } }
                    .transition(.opacity)
            } else {
                Button { withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) { showExtras = true } } label: {
                    Text("\(extras.count) more could wait until you want them")
                        .font(Theme.caption).foregroundStyle(Theme.inkFaint).underline()
                }.buttonStyle(.plain)
            }
        }

        if let q = store.needsTask.first {
            Button { editQuest = q } label: {
                HStack(spacing: 10) {
                    Image(systemName: "plus.circle").foregroundStyle(Theme.accent)
                    Text("“\(q.name)” has no tasks — add one").font(Theme.caption).foregroundStyle(Theme.inkSoft)
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.inkFaint)
                }.padding(13).glass()
            }.buttonStyle(.plain)
        }

        HStack {
            Spacer()
            Button { withAnimation { store.declareEnoughForToday() } } label: {
                Label("That's enough for today", systemImage: "checkmark.circle")
            }.buttonStyle(QuietButtonStyle())
        }
        .padding(.top, 8)
    }

    @ViewBuilder private var quietState: some View {
        VStack(alignment: .leading, spacing: 16) {
            if !store.hasAnyQuests {
                Image(systemName: "flag.fill").font(.system(size: 26)).foregroundStyle(Theme.accent)
                Text("Add your first quest").font(Theme.titleM).foregroundStyle(Theme.ink)
                Text("A quest is something you're working on. Give it a few tasks, and Waymark will show you what to focus on each day.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
                Button { showNewQuest = true } label: { Label("New quest", systemImage: "plus") }
                    .buttonStyle(PrimaryActionButtonStyle(big: true))
            } else {
                HStack(spacing: 10) {
                    Image(systemName: "leaf.fill").foregroundStyle(Theme.accent)
                    Text("Nothing's pressing right now.").font(Theme.titleM).foregroundStyle(Theme.ink)
                }
                Text("Every quest is resting or finished. Enjoy the quiet, or open Quests to add a task.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
                Button { goToQuests() } label: { Label("Open Quests", systemImage: "flag.fill") }
                    .buttonStyle(QuietButtonStyle())
            }
        }
        .padding(24).glass()
    }
}

/// A small secondary task row, shown only when the user asks for "more."
struct CompactTaskRow: View {
    @EnvironmentObject var store: DataStore
    let ranked: RankedTask
    var body: some View {
        HStack(spacing: 12) {
            Button {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) { store.completeTask(ranked.task, in: ranked.quest) }
            } label: { Image(systemName: "circle").font(.system(size: 16)).foregroundStyle(Theme.inkFaint) }
                .buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 3) {
                Text(ranked.task.title).font(Theme.bodyMed).foregroundStyle(Theme.ink)
                Text(ranked.quest.name).font(Theme.caption).foregroundStyle(Theme.inkFaint)
            }
            Spacer()
        }
        .padding(14).glass()
    }
}
