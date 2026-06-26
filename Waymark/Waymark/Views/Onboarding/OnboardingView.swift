import SwiftUI

/// The guided first-run. It explains what Waymark is *for* and the difference between
/// a goal and a project before asking for anything — then collects just your goals.
/// You add projects afterward, one at a time, on the Today screen.
struct OnboardingView: View {
    @EnvironmentObject var store: DataStore

    private enum Step: Int, CaseIterable { case welcome, how, goals }
    @State private var step: Step = .welcome

    @State private var goalDraft = ""
    @State private var goals: [String] = []
    private let goalExamples = ["Grow my film career", "Provide for my family", "Stay creative", "Get healthy"]

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            content
                .frame(maxWidth: 560)
                .padding(38)
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
        }
    }

    private var welcomeStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            Image(systemName: "location.north.circle.fill")
                .font(.system(size: 40)).foregroundStyle(Theme.accent)
            Text("Welcome to Waymark")
                .font(Theme.titleXL).foregroundStyle(Theme.ink)
            Text("You're juggling a lot. Waymark cuts through it and shows you the one thing worth your focus today — so you make real progress on what matters, and still have a life.")
                .font(.system(size: 16)).foregroundStyle(Theme.inkSoft).lineSpacing(5)
            Button("Begin") { step = .how }
                .buttonStyle(PrimaryActionButtonStyle(big: true)).padding(.top, 6)
        }
    }

    private var howStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            Eyebrow(text: "The idea")
            Text("Goals hold projects")
                .font(Theme.titleL).foregroundStyle(Theme.ink)
            Text("A **goal** is a big thing you're working toward. A **project** is a specific piece of work that moves a goal forward. Each project has one **next step**.")
                .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)

            // A small worked example so the difference is concrete.
            VStack(alignment: .leading, spacing: 10) {
                exampleRow("mountain.2.fill", "Goal", "Grow my film career", Theme.accent)
                indentArrow
                exampleRow("map.fill", "Project", "Pelagos — short film", Theme.goalColor(0))
                indentArrow
                exampleRow("arrow.forward.circle.fill", "Next step", "Render shot 14", Theme.inkSoft)
            }
            .padding(16)
            .background(RoundedRectangle(cornerRadius: Theme.cornerS).fill(Color.white.opacity(0.6)))

            HStack {
                Button { step = .welcome } label: { Image(systemName: "chevron.left") }.buttonStyle(QuietButtonStyle())
                Button("Next") { step = .goals }.buttonStyle(PrimaryActionButtonStyle())
            }
        }
    }

    private var goalsStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            Eyebrow(text: "Let's set up")
            Text("What are you working toward?")
                .font(Theme.titleL).foregroundStyle(Theme.ink)
            Text("Name a few goals in your own words — the big areas, not specific tasks. You'll add the actual projects next, inside the app.")
                .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)

            HStack(spacing: 8) {
                TextField("e.g. Grow my film career", text: $goalDraft)
                    .textFieldStyle(.plain).font(Theme.body).foregroundStyle(Theme.ink)
                    .padding(11).background(RoundedRectangle(cornerRadius: Theme.cornerS).fill(Color.white.opacity(0.85)))
                    .overlay(RoundedRectangle(cornerRadius: Theme.cornerS).strokeBorder(Theme.hairlineHi, lineWidth: 1))
                    .onSubmit(addGoal)
                Button(action: addGoal) { Image(systemName: "plus") }
                    .buttonStyle(PrimaryActionButtonStyle())
                    .disabled(goalDraft.trimmingCharacters(in: .whitespaces).isEmpty)
            }

            if goals.isEmpty {
                Text("Tap to add, or type your own:").font(Theme.caption).foregroundStyle(Theme.inkFaint)
                FlowChips(items: goalExamples) { ex in if !goals.contains(ex) { goals.append(ex) } }
            } else {
                FlowChips(items: goals, removable: true, colorForIndex: { Theme.goalColor($0) }) { g in
                    goals.removeAll { $0 == g }
                }
            }

            HStack {
                Button { step = .how } label: { Image(systemName: "chevron.left") }.buttonStyle(QuietButtonStyle())
                Button("Enter Waymark") { finish() }
                    .buttonStyle(PrimaryActionButtonStyle())
                    .disabled(goals.isEmpty).opacity(goals.isEmpty ? 0.5 : 1)
            }
        }
    }

    private func exampleRow(_ icon: String, _ label: String, _ text: String, _ color: Color) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon).font(.system(size: 13)).foregroundStyle(color).frame(width: 20)
            Text(label.uppercased()).font(Theme.eyebrow).tracking(1).foregroundStyle(Theme.inkFaint).frame(width: 74, alignment: .leading)
            Text(text).font(Theme.bodyMed).foregroundStyle(Theme.ink)
            Spacer()
        }
    }
    private var indentArrow: some View {
        Image(systemName: "arrow.turn.down.right")
            .font(.system(size: 10)).foregroundStyle(Theme.inkFaint.opacity(0.6)).padding(.leading, 24)
    }

    private var dots: some View {
        HStack(spacing: 7) {
            ForEach(Step.allCases, id: \.rawValue) { s in
                Circle().fill(s == step ? Theme.accent : Theme.ink.opacity(0.18)).frame(width: 7, height: 7)
            }
        }
    }

    private func addGoal() {
        let t = goalDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, !goals.contains(t) else { return }
        goals.append(t); goalDraft = ""
    }
    private func finish() {
        for g in goals where !store.goals.contains(where: { $0.name == g }) { store.addGoal(named: g) }
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
            .background(Capsule().fill(selected ? Theme.accent : Color.white.opacity(0.7)))
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
