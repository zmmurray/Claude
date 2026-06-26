import SwiftUI

struct GoalsView: View {
    @EnvironmentObject var store: DataStore
    @State private var newGoal = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Goals").font(Theme.titleXL).foregroundStyle(Theme.ink)
                    Text("Your long game. Each goal grows as you make real progress — and one that's gone quiet is a quiet sign it needs you.")
                        .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
                        .frame(maxWidth: 540, alignment: .leading)
                }

                ForEach(store.goals) { goal in
                    GoalCard(goal: goal)
                }

                addGoalRow
                appearancePanel
            }
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.horizontal, 44).padding(.top, 54).padding(.bottom, 44)
        }
        .scrollIndicators(.hidden)
    }

    private var addGoalRow: some View {
        HStack(spacing: 8) {
            TextField("Add a goal…", text: $newGoal)
                .textFieldStyle(.plain).font(Theme.body).foregroundStyle(Theme.ink)
                .padding(11).background(Capsule().fill(.ultraThinMaterial))
                .overlay(Capsule().strokeBorder(Color.white.opacity(0.5), lineWidth: 1))
                .onSubmit(addGoal)
            Button(action: addGoal) { Image(systemName: "plus") }
                .buttonStyle(PrimaryActionButtonStyle())
                .disabled(newGoal.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    private var appearancePanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow(text: "Appearance")
            Text("Make it yours — set a photo as your backdrop (one of your own stills works beautifully).")
                .font(Theme.caption).foregroundStyle(Theme.inkSoft)
            HStack(spacing: 12) {
                Button { if let url = pickBackgroundImage() { store.setBackgroundImage(from: url) } } label: {
                    Label("Choose background…", systemImage: "photo")
                }.buttonStyle(QuietButtonStyle())
                if store.hasCustomBackground {
                    Button { store.clearBackgroundImage() } label: {
                        Label("Use built-in", systemImage: "sparkles")
                    }.buttonStyle(QuietButtonStyle())
                }
                Spacer()
                Button { withAnimation { store.restartOnboarding() } } label: {
                    Text("Replay intro").font(Theme.caption).foregroundStyle(Theme.inkFaint).underline()
                }.buttonStyle(.plain)
            }
        }
        .padding(20).frame(maxWidth: .infinity, alignment: .leading).glass()
        .padding(.top, 8)
    }

    private func addGoal() {
        let t = newGoal.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return }
        store.addGoal(named: t); newGoal = ""
    }
}
