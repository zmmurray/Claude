import SwiftUI

struct TodayView: View {
    @EnvironmentObject var store: DataStore
    var goToQuests: () -> Void = {}

    @State private var revealMore = false
    @State private var showExtras = false
    @State private var stepEditor: Quest? = nil
    @State private var showNewProject = false

    private var dateLine: String {
        let f = DateFormatter(); f.dateFormat = "EEEE, MMMM d"
        return f.string(from: Date())
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                if store.hasDoneEnoughToday {
                    EnoughView(revealMore: $revealMore)
                } else if let lead = store.leadFocus {
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
        .sheet(item: $stepEditor) { q in NextStepSheet(quest: q).environmentObject(store) }
        .sheet(isPresented: $showNewProject) { QuestEditorSheet(existing: nil).environmentObject(store) }
        .animation(.spring(response: 0.5, dampingFraction: 0.85), value: store.hasDoneEnoughToday)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(text: dateLine)
            Text(store.hasDoneEnoughToday ? "Today" : "The one thing worth your focus")
                .font(Theme.titleL).foregroundStyle(Theme.ink)
        }
        .padding(.bottom, 4)
    }

    @ViewBuilder private func focus(_ lead: RankedQuest) -> some View {
        FocusCard(ranked: lead)

        let extras = store.extraFocus
        if !extras.isEmpty {
            if showExtras {
                VStack(spacing: 12) {
                    ForEach(extras) { CompactFocusRow(ranked: $0) }
                }.transition(.opacity)
            } else {
                Button {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) { showExtras = true }
                } label: {
                    Text("\(extras.count) more could wait until you want them")
                        .font(Theme.caption).foregroundStyle(Theme.inkFaint).underline()
                }.buttonStyle(.plain)
            }
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
        let stuck = store.needsNextStep
        VStack(alignment: .leading, spacing: 16) {
            if !store.hasAnyQuests {
                // No projects yet — the one guided action.
                Image(systemName: "map.fill").font(.system(size: 26)).foregroundStyle(Theme.accent)
                Text("Add your first project")
                    .font(Theme.titleM).foregroundStyle(Theme.ink)
                Text("A project is a real piece of work under one of your goals — like a film, a client job, or a trip — with one concrete next step. Waymark will then show you what to focus on each day.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
                Button { showNewProject = true } label: { Label("New project", systemImage: "plus") }
                    .buttonStyle(PrimaryActionButtonStyle(big: true))
            } else if stuck.isEmpty {
                HStack(spacing: 10) {
                    Image(systemName: "leaf.fill").foregroundStyle(Theme.accent)
                    Text("Nothing's pressing right now.").font(Theme.titleM).foregroundStyle(Theme.ink)
                }
                Text("Enjoy the quiet, or open Projects when you're ready to line up your next move.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
                Button { goToQuests() } label: { Label("Open Projects", systemImage: "map.fill") }
                    .buttonStyle(QuietButtonStyle())
            } else {
                HStack(spacing: 10) {
                    Image(systemName: "leaf.fill").foregroundStyle(Theme.accent)
                    Text("A project is waiting on a next step.").font(Theme.titleM).foregroundStyle(Theme.ink)
                }
                Text("Name one small move and it becomes doable.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft)
                ForEach(stuck) { q in
                    Button { stepEditor = q } label: {
                        HStack {
                            Text(q.name).font(Theme.bodyMed).foregroundStyle(Theme.ink)
                            Spacer()
                            Text("Name a step").font(Theme.caption).foregroundStyle(Theme.accent)
                        }.padding(14).glass()
                    }.buttonStyle(.plain)
                }
            }
        }
        .padding(24).glass()
    }
}

/// A small secondary focus row, shown only when the user asks for "more."
struct CompactFocusRow: View {
    @EnvironmentObject var store: DataStore
    let ranked: RankedQuest
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(ranked.quest.nextStep).font(Theme.bodyMed).foregroundStyle(Theme.ink)
                Text(ranked.quest.name).font(Theme.caption).foregroundStyle(Theme.inkFaint)
            }
            Spacer()
            Button {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) { store.completeNextStep(ranked.quest) }
            } label: { Image(systemName: "checkmark") }
                .buttonStyle(.plain).foregroundStyle(Theme.accent)
        }
        .padding(14).glass()
    }
}
