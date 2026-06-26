import SwiftUI

/// The guided first-run. Explains what Waymark is and how quests + tasks work, then
/// lets you set up with your AI assistant or by adding a first quest by hand.
struct OnboardingView: View {
    @EnvironmentObject var store: DataStore

    private enum Step: Int, CaseIterable { case welcome, how, setup }
    @State private var step: Step = .welcome
    @State private var showAI = false

    @State private var questName = ""
    @State private var firstTask = ""

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
        .sheet(isPresented: $showAI) {
            AISetupView(onImported: { store.completeOnboarding() }).environmentObject(store)
        }
    }

    @ViewBuilder private var content: some View {
        switch step {
        case .welcome: welcomeStep
        case .how:     howStep
        case .setup:   setupStep
        }
    }

    private var welcomeStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            Image(systemName: "location.north.circle.fill").font(.system(size: 40)).foregroundStyle(Theme.accent)
            Text("Welcome to Waymark").font(Theme.titleXL).foregroundStyle(Theme.ink)
            Text("You're juggling a lot. Waymark shows you the few tasks worth your focus today — then tells you when you've done enough, so you can get on with your life.")
                .font(.system(size: 16)).foregroundStyle(Theme.inkSoft).lineSpacing(5)
            Button("Begin") { step = .how }.buttonStyle(PrimaryActionButtonStyle(big: true)).padding(.top, 6)
        }
    }

    private var howStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            Eyebrow(text: "How it works")
            Text("Quests and tasks").font(Theme.titleL).foregroundStyle(Theme.ink)
            Text("A **quest** is something you're working on. Inside it are **tasks** — small to-dos. Each day, Waymark picks the tasks that matter most across all your quests.")
                .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)

            VStack(alignment: .leading, spacing: 10) {
                exampleRow("flag.fill", "Quest", "Pelagos — short film", Theme.accent)
                indentArrow
                exampleRow("circle", "Task", "Render shot 14", Theme.inkSoft)
                indentArrow
                exampleRow("circle", "Task", "Send the festival email", Theme.inkSoft)
            }
            .padding(16)
            .background(RoundedRectangle(cornerRadius: Theme.cornerS).fill(Color.white.opacity(0.6)))

            HStack {
                Button { step = .welcome } label: { Image(systemName: "chevron.left") }.buttonStyle(QuietButtonStyle())
                Button("Next") { step = .setup }.buttonStyle(PrimaryActionButtonStyle())
            }
        }
    }

    private var setupStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            Eyebrow(text: "Let's set up")
            Text("Two ways to start").font(Theme.titleL).foregroundStyle(Theme.ink)

            Button { showAI = true } label: {
                HStack(spacing: 12) {
                    Image(systemName: "sparkles").font(.system(size: 16)).foregroundStyle(.white)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Set up with your AI assistant").font(Theme.bodyMed).foregroundStyle(.white)
                        Text("Paste from ChatGPT or Claude — it knows your projects").font(Theme.caption).foregroundStyle(.white.opacity(0.85))
                    }
                    Spacer()
                    Image(systemName: "chevron.right").foregroundStyle(.white.opacity(0.85))
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: Theme.cornerS)
                    .fill(LinearGradient(colors: [Theme.accent, Theme.accentDeep], startPoint: .top, endPoint: .bottom)))
            }
            .buttonStyle(.plain)

            Text("or add your first quest by hand").font(Theme.caption).foregroundStyle(Theme.inkFaint)

            field("Quest", "e.g. Pelagos — short film", text: $questName)
            field("First task", "e.g. Render shot 14", text: $firstTask)

            HStack {
                Button { step = .how } label: { Image(systemName: "chevron.left") }.buttonStyle(QuietButtonStyle())
                Button("Enter Waymark") { finish() }.buttonStyle(PrimaryActionButtonStyle())
            }
        }
    }

    private func field(_ label: String, _ placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(text: label)
            TextField(placeholder, text: text)
                .textFieldStyle(.plain).font(Theme.body).foregroundStyle(Theme.ink)
                .padding(11).background(RoundedRectangle(cornerRadius: Theme.cornerS).fill(Color.white.opacity(0.85)))
                .overlay(RoundedRectangle(cornerRadius: Theme.cornerS).strokeBorder(Theme.inkFaint.opacity(0.3), lineWidth: 1))
        }
    }

    private func exampleRow(_ icon: String, _ label: String, _ text: String, _ color: Color) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon).font(.system(size: 13)).foregroundStyle(color).frame(width: 20)
            Text(label.uppercased()).font(Theme.eyebrow).tracking(1).foregroundStyle(Theme.inkFaint).frame(width: 56, alignment: .leading)
            Text(text).font(Theme.bodyMed).foregroundStyle(Theme.ink)
            Spacer()
        }
    }
    private var indentArrow: some View {
        Image(systemName: "arrow.turn.down.right").font(.system(size: 10)).foregroundStyle(Theme.inkFaint.opacity(0.6)).padding(.leading, 24)
    }
    private var dots: some View {
        HStack(spacing: 7) {
            ForEach(Step.allCases, id: \.rawValue) { s in
                Circle().fill(s == step ? Theme.accent : Theme.ink.opacity(0.18)).frame(width: 7, height: 7)
            }
        }
    }

    private func finish() {
        let name = questName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !name.isEmpty {
            let task = firstTask.trimmingCharacters(in: .whitespacesAndNewlines)
            let tasks = task.isEmpty ? [] : [TaskItem(title: task)]
            store.upsert(Quest(name: name, tasks: tasks))
        }
        withAnimation { store.completeOnboarding() }
    }
}
