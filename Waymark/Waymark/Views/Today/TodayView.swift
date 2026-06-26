import SwiftUI

struct TodayView: View {
    @EnvironmentObject var store: DataStore
    var goToQuests: () -> Void = {}

    @State private var revealMore = false
    @State private var showExtras = false
    @State private var stepEditor: Quest? = nil
    @State private var showNewQuest = false

    private var dateLine: String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d"
        return f.string(from: Date())
    }
    private var greeting: String {
        switch Calendar.current.component(.hour, from: Date()) {
        case 5..<12:  return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<22: return "Good evening"
        default:      return "Hello"
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                if !store.hasAnyQuests {
                    WelcomeState(showNewQuest: $showNewQuest)
                } else if store.hasDoneEnoughToday {
                    header
                    EnoughView(revealMore: $revealMore)
                } else if let lead = store.leadFocus {
                    header
                    focusArea(lead: lead)
                } else {
                    header
                    NoNextStepsState(stepEditor: $stepEditor, goToQuests: goToQuests)
                }
            }
            .frame(maxWidth: 680, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.horizontal, 44)
            .padding(.vertical, 40)
        }
        .scrollIndicators(.hidden)
        .sheet(item: $stepEditor) { q in NextStepSheet(quest: q).environmentObject(store) }
        .sheet(isPresented: $showNewQuest) { QuestEditorSheet(existing: nil).environmentObject(store) }
        .animation(.spring(response: 0.5, dampingFraction: 0.85), value: store.hasDoneEnoughToday)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(text: dateLine)
            Text(greeting)
                .font(Theme.titleXL)
                .foregroundStyle(Theme.ink)
        }
    }

    @ViewBuilder
    private func focusArea(lead: RankedQuest) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Your next step")
                .font(Theme.titleM)
                .foregroundStyle(Theme.inkSoft)

            FocusCard(ranked: lead, isLeader: true)

            // Extras: hidden by default so the screen stays calm. Reveal on request.
            let extras = store.extraFocus
            if !extras.isEmpty {
                if showExtras {
                    VStack(spacing: 12) {
                        ForEach(extras) { item in
                            FocusCard(ranked: item, isLeader: false)
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                } else {
                    Button {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) { showExtras = true }
                    } label: {
                        Text("\(extras.count) more worth today, if you want")
                            .font(Theme.caption)
                            .foregroundStyle(Theme.inkFaint)
                            .underline()
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 2)
                }
            }

            needsStepNudge

            HStack {
                Spacer()
                Button { withAnimation { store.declareEnoughForToday() } } label: {
                    Label("That's enough for today", systemImage: "checkmark.circle")
                }
                .buttonStyle(QuietButtonStyle())
            }
            .padding(.top, 6)
        }
    }

    @ViewBuilder
    private var needsStepNudge: some View {
        if let q = store.needsNextStep.first {
            Button { stepEditor = q } label: {
                HStack(spacing: 10) {
                    Image(systemName: "signpost.right")
                        .foregroundStyle(Theme.moss)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("“\(q.name)” needs a next step")
                            .font(Theme.bodyMed).foregroundStyle(Theme.ink)
                        Text("Name one small move and it becomes doable.")
                            .font(Theme.caption).foregroundStyle(Theme.inkSoft)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.inkFaint)
                }
                .padding(14)
                .card()
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - First-run welcome

private struct WelcomeState: View {
    @EnvironmentObject var store: DataStore
    @Binding var showNewQuest: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer(minLength: 24)
            ZStack {
                Circle().fill(Theme.accentWash).frame(width: 64, height: 64)
                Image(systemName: "flag.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(Theme.accent)
            }
            .padding(.bottom, 22)

            Text("Welcome to Waymark")
                .font(Theme.titleXL).foregroundStyle(Theme.ink)
                .padding(.bottom, 10)

            Text("Each project is a quest. Waymark holds them all and shows you the one next step worth doing today — so you always know exactly where to start.")
                .font(.system(size: 15)).foregroundStyle(Theme.inkSoft)
                .lineSpacing(5)
                .frame(maxWidth: 460, alignment: .leading)
                .padding(.bottom, 26)

            HStack(spacing: 12) {
                Button { showNewQuest = true } label: {
                    Label("Add your first quest", systemImage: "plus")
                }
                .buttonStyle(PrimaryActionButtonStyle(big: true))

                Button { withAnimation { store.loadSampleQuests() } } label: {
                    Text("or explore with examples")
                        .font(Theme.bodyMed).foregroundStyle(Theme.accent)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Quiet states

private struct NoNextStepsState: View {
    @EnvironmentObject var store: DataStore
    @Binding var stepEditor: Quest?
    var goToQuests: () -> Void

    var body: some View {
        let stuck = store.needsNextStep
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                Image(systemName: "leaf.fill").foregroundStyle(Theme.moss)
                Text("Nothing's pressing right now.")
                    .font(Theme.titleM).foregroundStyle(Theme.ink)
            }
            if stuck.isEmpty {
                Text("Every quest is resting or finished. Enjoy the quiet — or open Quests to line up your next move.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
                Button { goToQuests() } label: { Label("Open Quests", systemImage: "map.fill") }
                    .buttonStyle(QuietButtonStyle())
            } else {
                Text("A few quests matter but have no next step yet. Name one and it becomes doable.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
                VStack(spacing: 10) {
                    ForEach(stuck) { q in
                        Button { stepEditor = q } label: {
                            HStack(spacing: 10) {
                                Text(q.name).font(Theme.bodyMed).foregroundStyle(Theme.ink)
                                Spacer()
                                Text("Name a step").font(Theme.caption).foregroundStyle(Theme.accent)
                            }
                            .padding(13).card()
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(24).card()
    }
}
