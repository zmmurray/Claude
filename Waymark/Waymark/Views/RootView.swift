import SwiftUI

enum Destination: String, CaseIterable, Identifiable {
    case today, quests
    var id: String { rawValue }
    var title: String {
        switch self {
        case .today:  return "Today"
        case .quests: return "Quests"
        }
    }
    var icon: String {
        switch self {
        case .today:  return "flag.fill"
        case .quests: return "map.fill"
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: DataStore
    @State private var selection: Destination = .today

    var body: some View {
        NavigationSplitView {
            Sidebar(selection: $selection)
                .navigationSplitViewColumnWidth(min: 184, ideal: 196, max: 220)
        } detail: {
            ZStack {
                AppBackground()
                Group {
                    switch selection {
                    case .today:  TodayView(goToQuests: { selection = .quests })
                    case .quests: QuestsView()
                    }
                }
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.22), value: selection)
    }
}

private struct Sidebar: View {
    @EnvironmentObject var store: DataStore
    @Binding var selection: Destination

    var body: some View {
        ZStack {
            AppBackground()
            VStack(alignment: .leading, spacing: 0) {
                // Wordmark
                HStack(spacing: 9) {
                    ZStack {
                        Circle().fill(Theme.accentWash).frame(width: 30, height: 30)
                        Image(systemName: "flag.fill")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.accent)
                    }
                    Text("Waymark")
                        .font(Theme.display(21, weight: .bold))
                        .foregroundStyle(Theme.ink)
                }
                .padding(.horizontal, 16)
                .padding(.top, 24)
                .padding(.bottom, 26)

                VStack(spacing: 5) {
                    ForEach(Destination.allCases) { dest in
                        NavButton(dest: dest, isSelected: selection == dest) {
                            selection = dest
                        }
                    }
                }
                .padding(.horizontal, 10)

                Spacer()
            }
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
                Image(systemName: dest.icon)
                    .font(.system(size: 14))
                    .frame(width: 20)
                    .foregroundStyle(isSelected ? Theme.accent : Theme.inkFaint)
                Text(dest.title)
                    .font(Theme.bodyMed)
                    .foregroundStyle(isSelected ? Theme.ink : Theme.inkSoft)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerS, style: .continuous)
                    .fill(isSelected ? Theme.surface : (hovering ? Theme.surface.opacity(0.6) : .clear))
                    .shadow(color: Theme.ink.opacity(isSelected ? 0.06 : 0), radius: 6, y: 2)
            )
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
    }
}
