import SwiftUI

enum Destination: String, CaseIterable, Identifiable {
    case today, quests
    var id: String { rawValue }
    var title: String { self == .today ? "Today" : "Quests" }
    var icon: String { self == .today ? "sun.horizon.fill" : "flag.fill" }
}

struct RootView: View {
    @EnvironmentObject var store: DataStore
    @State private var selection: Destination = .today
    @State private var showSettings = false

    var body: some View {
        ZStack {
            AppBackdrop()
            if !store.onboardingComplete {
                OnboardingView().transition(.opacity)
            } else {
                HStack(spacing: 0) {
                    NavRail(selection: $selection, showSettings: $showSettings)
                    Group {
                        switch selection {
                        case .today:  TodayView(goToQuests: { selection = .quests })
                        case .quests: QuestsView()
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity)
                }
            }
        }
        .animation(.easeInOut(duration: 0.24), value: selection)
        .animation(.easeInOut(duration: 0.35), value: store.onboardingComplete)
        .sheet(isPresented: $showSettings) { SettingsView().environmentObject(store) }
    }
}

private struct NavRail: View {
    @Binding var selection: Destination
    @Binding var showSettings: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 9) {
                Image(systemName: "location.north.circle.fill").font(.system(size: 18)).foregroundStyle(Theme.accent)
                Text("Waymark").font(Theme.display(20, weight: .semibold)).foregroundStyle(Theme.ink)
            }
            .padding(.horizontal, 16).padding(.top, 40).padding(.bottom, 26)

            VStack(spacing: 5) {
                ForEach(Destination.allCases) { dest in
                    NavButton(icon: dest.icon, title: dest.title, isSelected: selection == dest) { selection = dest }
                }
            }
            .padding(.horizontal, 10)

            Spacer()

            NavButton(icon: "gearshape.fill", title: "Settings", isSelected: false) { showSettings = true }
                .padding(.horizontal, 10).padding(.bottom, 16)
        }
        .frame(width: 206)
        .background(
            LinearGradient(colors: [Color.white.opacity(0.30), Color.white.opacity(0.10)],
                           startPoint: .top, endPoint: .bottom)
                .background(.ultraThinMaterial).ignoresSafeArea()
        )
        .overlay(alignment: .trailing) { Rectangle().fill(Color.white.opacity(0.4)).frame(width: 1).ignoresSafeArea() }
    }
}

private struct NavButton: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void
    @State private var hovering = false
    var body: some View {
        Button(action: action) {
            HStack(spacing: 11) {
                Image(systemName: icon).font(.system(size: 14)).frame(width: 20)
                    .foregroundStyle(isSelected ? Theme.accent : Theme.inkFaint)
                Text(title).font(Theme.bodyMed).foregroundStyle(isSelected ? Theme.ink : Theme.inkSoft)
                Spacer()
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(RoundedRectangle(cornerRadius: Theme.cornerS, style: .continuous)
                .fill(isSelected ? Color.white.opacity(0.55) : (hovering ? Color.white.opacity(0.28) : .clear)))
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
    }
}
