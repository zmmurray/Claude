import SwiftUI

struct TodayView: View {
    @EnvironmentObject var store: DataStore
    @State private var revealMore = false
    @State private var stepEditor: Quest? = nil

    private var dateLine: String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d"
        return f.string(from: Date())
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.gutter) {
                header

                if !store.hasAnyQuests {
                    TodayEmptyState()
                } else if store.hasDoneEnoughToday {
                    EnoughView(revealMore: $revealMore)
                } else if !store.hasActionableQuests {
                    NoNextStepsState(stepEditor: $stepEditor)
                } else {
                    focusList
                }
            }
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.horizontal, 48)
            .padding(.vertical, 44)
        }
        .scrollIndicators(.hidden)
        .sheet(item: $stepEditor) { q in
            NextStepSheet(quest: q).environmentObject(store)
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.82), value: store.hasDoneEnoughToday)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: dateLine)
            Text(greeting)
                .font(Theme.titleXL)
                .foregroundStyle(Theme.ink)
        }
    }

    private var greeting: String {
        let h = Calendar.current.component(.hour, from: Date())
        switch h {
        case 5..<12:  return "Good morning."
        case 12..<17: return "Good afternoon."
        case 17..<22: return "Good evening."
        default:      return "Late one."
        }
    }

    @ViewBuilder
    private var focusList: some View {
        let focus = store.todaysFocus
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .firstTextBaseline) {
                Text(focus.count == 1 ? "One thing deserves today" : "What deserves today")
                    .font(Theme.titleM)
                    .foregroundStyle(Theme.ink)
                Spacer()
                Text(focus.count == 1 ? "" : "\(focus.count) chosen")
                    .font(Theme.caption)
                    .foregroundStyle(Theme.inkFaint)
            }

            VStack(spacing: 14) {
                ForEach(Array(focus.enumerated()), id: \.element.id) { idx, item in
                    FocusCard(ranked: item, isLeader: idx == 0)
                        .transition(.asymmetric(
                            insertion: .opacity,
                            removal: .opacity.combined(with: .scale(scale: 0.96)))
                        )
                }
            }
            .animation(.spring(response: 0.45, dampingFraction: 0.8), value: focus.map(\.id))

            needsStepNudge

            // Resting is a valid way to win the day — quietly offered, never pushed.
            HStack {
                Spacer()
                Button {
                    withAnimation { store.declareEnoughForToday() }
                } label: {
                    Label("I've done enough today", systemImage: "moon.stars")
                }
                .buttonStyle(QuietButtonStyle())
            }
            .padding(.top, 4)
        }
    }

    @ViewBuilder
    private var needsStepNudge: some View {
        let stuck = store.needsNextStep
        if let q = stuck.first {
            Button { stepEditor = q } label: {
                HStack(spacing: 10) {
                    Image(systemName: "signpost.right.and.left")
                        .foregroundStyle(q.axis.color)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(q.name) is stuck without a next step")
                            .font(Theme.bodyMed).foregroundStyle(Theme.ink)
                        Text("Name one small move and it becomes doable.")
                            .font(Theme.caption).foregroundStyle(Theme.inkSoft)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.inkFaint)
                }
                .padding(14)
                .card(accentEdge: q.axis.color.opacity(0.3))
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - Empty & quiet states

private struct TodayEmptyState: View {
    @EnvironmentObject var store: DataStore
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("No quests yet.")
                .font(Theme.titleM).foregroundStyle(Theme.ink)
            Text("Add the projects you're carrying — each with which goal it serves, how much it matters, any deadline, and a single concrete next step. Waymark will tell you what deserves today.")
                .font(Theme.body).foregroundStyle(Theme.inkSoft)
                .lineSpacing(4)
                .frame(maxWidth: 520, alignment: .leading)
            Button {
                withAnimation { store.loadSampleQuests() }
            } label: {
                Label("Add a few examples to see it work", systemImage: "wand.and.stars")
            }
            .buttonStyle(PrimaryActionButtonStyle())
            .padding(.top, 4)
        }
        .padding(28)
        .card()
    }
}

private struct NoNextStepsState: View {
    @EnvironmentObject var store: DataStore
    @Binding var stepEditor: Quest?
    var body: some View {
        let stuck = store.needsNextStep
        VStack(alignment: .leading, spacing: 16) {
            Text("Nothing's pressing right now.")
                .font(Theme.titleM).foregroundStyle(Theme.ink)
            if stuck.isEmpty {
                Text("Every quest is either resting or finished. Enjoy the quiet, or open Quests when you're ready to line up the next move.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
            } else {
                Text("A few quests matter but have no concrete next step. Name one and they become doable.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
                VStack(spacing: 10) {
                    ForEach(stuck) { q in
                        Button { stepEditor = q } label: {
                            HStack(spacing: 10) {
                                Circle().fill(q.axis.color).frame(width: 7, height: 7)
                                Text(q.name).font(Theme.bodyMed).foregroundStyle(Theme.ink)
                                Spacer()
                                Text("Name a step").font(Theme.caption).foregroundStyle(Theme.accent)
                            }
                            .padding(12)
                            .card()
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(28)
        .card()
    }
}
