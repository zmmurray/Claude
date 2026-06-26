import SwiftUI

enum Destination: String, CaseIterable, Identifiable {
    case today, quests, goals
    var id: String { rawValue }
    var title: String {
        switch self {
        case .today: return "Today"
        case .quests: return "Quests"
        case .goals: return "Goals"
        }
    }
    var icon: String {
        switch self {
        case .today: return "sun.horizon.fill"
        case .quests: return "map.fill"
        case .goals: return "mountain.2.fill"
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: DataStore
    @State private var selection: Destination = .today

    var body: some View {
        ZStack {
            AppBackdrop()

            if !store.onboardingComplete {
                OnboardingView()
                    .transition(.opacity)
            } else {
                HStack(spacing: 0) {
                    NavRail(selection: $selection)
                    Group {
                        switch selection {
                        case .today:  TodayView(goToQuests: { selection = .quests })
                        case .quests: QuestsView()
                        case .goals:  GoalsView()
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity)
                }
            }
        }
        .animation(.easeInOut(duration: 0.28), value: selection)
        .animation(.easeInOut(duration: 0.35), value: store.onboardingComplete)
    }
}

/// A slim, translucent navigation rail floating over the backdrop.
private struct NavRail: View {
    @EnvironmentObject var store: DataStore
    @Binding var selection: Destination

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 9) {
                Image(systemName: "location.north.circle.fill")
                    .font(.system(size: 18)).foregroundStyle(Theme.accent)
                Text("Waymark").font(Theme.display(20, weight: .semibold)).foregroundStyle(Theme.ink)
            }
            .padding(.horizontal, 16).padding(.top, 40).padding(.bottom, 26)

            VStack(spacing: 5) {
                ForEach(Destination.allCases) { dest in
                    NavButton(dest: dest, isSelected: selection == dest) { selection = dest }
                }
            }
            .padding(.horizontal, 10)

            Spacer()
        }
        .frame(width: 206)
        .background(
            LinearGradient(colors: [Color.white.opacity(0.30), Color.white.opacity(0.10)],
                           startPoint: .top, endPoint: .bottom)
                .background(.ultraThinMaterial)
                .ignoresSafeArea()
        )
        .overlay(alignment: .trailing) {
            Rectangle().fill(Color.white.opacity(0.4)).frame(width: 1).ignoresSafeArea()
        }
    }
}

private struct NavButton: View {
    let dest: Destination
    let isSelected: Bool
    let action: () -> Void
    @State private var hovering = false
    var body: some View {
        Button(action: action) {
            HStack(spacing: 11) {
                Image(systemName: dest.icon).font(.system(size: 14)).frame(width: 20)
                    .foregroundStyle(isSelected ? Theme.accent : Theme.inkFaint)
                Text(dest.title).font(Theme.bodyMed)
                    .foregroundStyle(isSelected ? Theme.ink : Theme.inkSoft)
                Spacer()
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerS, style: .continuous)
                    .fill(isSelected ? Color.white.opacity(0.55) : (hovering ? Color.white.opacity(0.28) : .clear))
            )
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
    }
}
