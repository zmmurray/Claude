import SwiftUI

/// The guided first-run. It explains what Waymark is *for* before it ever asks for
/// anything, then walks the user through naming their goals and first quest — one
/// calm screen and one action at a time.
struct OnboardingView: View {
    @EnvironmentObject var store: DataStore

    private enum Step: Int, CaseIterable { case welcome, how, goals, quest }
    @State private var step: Step = .welcome

    // Goals step
    @State private var goalDraft = ""
    @State private var goals: [String] = []
    private let goalExamples = ["My career", "Provide for my family", "A creative project", "Health", "Financial security"]

    // Quest step
    @State private var questName = ""
    @State private var questStep = ""
    @State private var questGoalIndex = 0

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            content
                .frame(maxWidth: 560)
                .padding(40)
                .glass(strong: true)
                .padding(.horizontal, 40)
            Spacer()
            dots.padding(.bottom, 30)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder private var content: some View {
        switch step {
        case .welcome: welcomeStep
        case .how:     howStep
        case .goals:   goalsStep
        case .quest:   questStep_
        }
    }

    // MARK: Steps

    private var welcomeStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            Image(systemName: "location.north.circle.fill")
                .font(.system(size: 40)).foregroundStyle(Theme.accent)
            Text("Welcome to Waymark")
                .font(Theme.titleXL).foregroundStyle(Theme.ink)
            Text("You're juggling a lot. Waymark cuts through it and shows you the *one* thing worth your focus today — so you make real progress on what matters, and still have a life.")
                .font(.system(size: 16)).foregroundStyle(Theme.inkSoft).lineSpacing(5)
            primaryNav("Begin", to: .how)
        }
    }

    private var howStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            Eyebrow(text: "How it works")
            Text("Three simple ideas")
                .font(Theme.titleL).foregroundStyle(Theme.ink)
            point("mountain.2.fill", "Goals", "The few things you're really working toward — in your words.")
            point("map.fill", "Quests", "Your projects. Each one serves a goal and has a single next step.")
            point("sun.horizon.fill", "Today", "Waymark picks what matters most right now — and tells you when you've done enough.")
            HStack {
                backButton(to: .welcome)
                primaryNav("Next", to: .goals)
            }
        }
    }

    private var goalsStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            Eyebrow(text: "Step 1 of 2")
            Text("What are you working toward?")
                .font(Theme.titleL).foregroundStyle(Theme.ink)
            Text("Name a few goals in your own words. They can be about work, money, family, health, or any creative dream — whatever matters to you.")
                .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)

            HStack(spacing: 8) {
                TextField("e.g. My film work", text: $goalDraft)
                    .textFieldStyle(.plain).font(Theme.body).foregroundStyle(Theme.ink)
                    .padding(11).background(Capsule().fill(.ultraThinMaterial))
                    .overlay(Capsule().strokeBorder(Color.white.opacity(0.5), lineWidth: 1))
                    .onSubmit(addGoal)
                Button(action: addGoal) { Image(systemName: "plus") }
                    .buttonStyle(PrimaryActionButtonStyle())
                    .disabled(goalDraft.trimmingCharacters(in: .whitespaces).isEmpty)
            }

            if goals.isEmpty {
                FlowChips(items: goalExamples) { ex in
                    if !goals.contains(ex) { goals.append(ex) }
                }
            } else {
                FlowChips(items: goals, removable: true, colorForIndex: { Theme.goalColor($0) }) { g in
                    goals.removeAll { $0 == g }
                }
            }

            HStack {
                backButton(to: .how)
                Button("Next") { commitGoals(); step = .quest }
                    .buttonStyle(PrimaryActionButtonStyle())
                    .disabled(goals.isEmpty).opacity(goals.isEmpty ? 0.5 : 1)
            }
        }
    }

    private var questStep_: some View {
        VStack(alignment: .leading, spacing: 16) {
            Eyebrow(text: "Step 2 of 2")
            Text("Add your first quest")
                .font(Theme.titleL).foregroundStyle(Theme.ink)
            Text("Pick a goal, name a project, and — most importantly — one concrete next step you could actually start.")
                .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)

            if !store.goals.isEmpty {
                FlowChips(items: store.goals.map(\.name),
                          selectedIndex: questGoalIndex,
                          colorForIndex: { Theme.goalColor($0) }) { name in
                    if let i = store.goals.firstIndex(where: { $0.name == name }) { questGoalIndex = i }
                }
            }
            field("Project name", "e.g. Short film — Pelagos", text: $questName)
            field("First step", "e.g. Render shot 14", text: $questStep)

            HStack {
                backButton(to: .goals)
                Button("Skip for now") { finish(addQuest: false) }.buttonStyle(QuietButtonStyle())
                Button("Enter Waymark") { finish(addQuest: true) }
                    .buttonStyle(PrimaryActionButtonStyle())
                    .disabled(questName.trimmingCharacters(in: .whitespaces).isEmpty)
                    .opacity(questName.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1)
            }
        }
    }

    // MARK: Pieces

    private func point(_ icon: String, _ title: String, _ body: String) -> some View {
        HStack(alignment: .top, spacing: 13) {
            Image(systemName: icon).font(.system(size: 16)).foregroundStyle(Theme.accent).frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(Theme.bodyMed).foregroundStyle(Theme.ink)
                Text(body).font(Theme.caption).foregroundStyle(Theme.inkSoft).lineSpacing(3)
            }
        }
    }

    private func field(_ label: String, _ placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: label)
            TextField(placeholder, text: text)
                .textFieldStyle(.plain).font(Theme.body).foregroundStyle(Theme.ink)
                .padding(11).background(RoundedRectangle(cornerRadius: Theme.cornerS).fill(.ultraThinMaterial))
                .overlay(RoundedRectangle(cornerRadius: Theme.cornerS).strokeBorder(Color.white.opacity(0.5), lineWidth: 1))
        }
    }

    private func primaryNav(_ title: String, to next: Step) -> some View {
        Button(title) { step = next }.buttonStyle(PrimaryActionButtonStyle(big: true)).padding(.top, 6)
    }
    private func backButton(to prev: Step) -> some View {
        Button { step = prev } label: { Image(systemName: "chevron.left") }.buttonStyle(QuietButtonStyle())
    }

    private var dots: some View {
        HStack(spacing: 7) {
            ForEach(Step.allCases, id: \.rawValue) { s in
                Circle().fill(s == step ? Theme.accent : Theme.ink.opacity(0.18))
                    .frame(width: 7, height: 7)
            }
        }
    }

    // MARK: Actions

    private func addGoal() {
        let t = goalDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, !goals.contains(t) else { return }
        goals.append(t); goalDraft = ""
    }
    private func commitGoals() {
        for g in goals where !store.goals.contains(where: { $0.name == g }) { store.addGoal(named: g) }
    }
    private func finish(addQuest: Bool) {
        commitGoals()
        if addQuest {
            let name = questName.trimmingCharacters(in: .whitespacesAndNewlines)
            if !name.isEmpty {
                let goalID = store.goals.indices.contains(questGoalIndex) ? store.goals[questGoalIndex].id : nil
                store.upsert(Quest(name: name, goalID: goalID, stage: .active,
                                   nextStep: questStep.trimmingCharacters(in: .whitespacesAndNewlines)))
            }
        }
        withAnimation { store.completeOnboarding() }
    }
}

/// A simple wrapping row of tappable chips (examples, selections).
struct FlowChips: View {
    let items: [String]
    var removable: Bool = false
    var selectedIndex: Int? = nil
    var colorForIndex: ((Int) -> Color)? = nil
    let action: (String) -> Void

    var body: some View {
        WrapLayout(spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.offset) { pair in
                chip(idx: pair.offset, item: pair.element)
            }
        }
    }

    private func chip(idx: Int, item: String) -> some View {
        let color = colorForIndex?(idx) ?? Theme.accent
        let selected = selectedIndex == idx
        return Button { action(item) } label: {
            HStack(spacing: 6) {
                if colorForIndex != nil { Circle().fill(color).frame(width: 7, height: 7) }
                Text(item).font(Theme.caption).foregroundStyle(selected ? .white : Theme.inkSoft)
                if removable { Image(systemName: "xmark").font(.system(size: 8)).foregroundStyle(Theme.inkFaint) }
            }
            .padding(.horizontal, 11).padding(.vertical, 7)
            .background(Capsule().fill(selected ? Theme.accent : Color.white.opacity(0.45)))
            .overlay(Capsule().strokeBorder(selected ? .clear : color.opacity(0.35), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

/// A wrapping HStack via the Layout protocol.
struct WrapLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? 400
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x + s.width > maxWidth, x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += s.width + spacing; rowHeight = max(rowHeight, s.height)
        }
        return CGSize(width: maxWidth, height: y + rowHeight)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let maxWidth = bounds.width
        var x: CGFloat = bounds.minX, y: CGFloat = bounds.minY, rowHeight: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x - bounds.minX + s.width > maxWidth, x > bounds.minX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing; rowHeight = max(rowHeight, s.height)
        }
    }
}
