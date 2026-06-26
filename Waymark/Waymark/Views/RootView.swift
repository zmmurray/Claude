import SwiftUI

enum Destination: String, CaseIterable, Identifiable {
    case today, quests, tracks
    var id: String { rawValue }
    var title: String {
        switch self {
        case .today:  return "Today"
        case .quests: return "Quests"
        case .tracks: return "Tracks"
        }
    }
    var icon: String {
        switch self {
        case .today:  return "sun.horizon"
        case .quests: return "map"
        case .tracks: return "chart.line.uptrend.xyaxis"
        }
    }
    var subtitle: String {
        switch self {
        case .today:  return "What deserves today"
        case .quests: return "Every project"
        case .tracks: return "The long game"
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: DataStore
    @State private var selection: Destination = .today

    var body: some View {
        NavigationSplitView {
            Sidebar(selection: $selection)
                .navigationSplitViewColumnWidth(min: 208, ideal: 224, max: 260)
        } detail: {
            ZStack {
                AppBackground()
                Group {
                    switch selection {
                    case .today:  TodayView()
                    case .quests: QuestsView()
                    case .tracks: TracksView()
                    }
                }
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: selection)
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
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        Image(systemName: "mountain.2.fill")
                            .font(.system(size: 15))
                            .foregroundStyle(Theme.accent)
                        Text("Waymark")
                            .font(Theme.display(20, weight: .semibold))
                            .foregroundStyle(Theme.ink)
                    }
                    Text("expedition journal")
                        .font(Theme.caption)
                        .foregroundStyle(Theme.inkFaint)
                        .padding(.leading, 1)
                }
                .padding(.horizontal, 18)
                .padding(.top, 26)
                .padding(.bottom, 28)

                // Nav
                VStack(spacing: 4) {
                    ForEach(Destination.allCases) { dest in
                        NavButton(dest: dest, isSelected: selection == dest) {
                            selection = dest
                        }
                    }
                }
                .padding(.horizontal, 12)

                Spacer()

                // A quiet axis legend grounds the color language.
                VStack(alignment: .leading, spacing: 9) {
                    Eyebrow(text: "Axes")
                        .padding(.leading, 6)
                    ForEach(StrategicAxis.allCases) { axis in
                        HStack(spacing: 8) {
                            Circle().fill(axis.color).frame(width: 7, height: 7)
                            Text(axis.shortName)
                                .font(Theme.caption)
                                .foregroundStyle(Theme.inkSoft)
                        }
                        .padding(.leading, 6)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 22)
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
            HStack(spacing: 12) {
                Image(systemName: dest.icon)
                    .font(.system(size: 15))
                    .frame(width: 22)
                    .foregroundStyle(isSelected ? Theme.accent : Theme.inkSoft)
                VStack(alignment: .leading, spacing: 1) {
                    Text(dest.title)
                        .font(Theme.bodyMed)
                        .foregroundStyle(isSelected ? Theme.ink : Theme.inkSoft)
                    Text(dest.subtitle)
                        .font(.system(size: 10.5))
                        .foregroundStyle(Theme.inkFaint)
                }
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerS, style: .continuous)
                    .fill(isSelected ? Theme.surfaceHi : (hovering ? Theme.surface.opacity(0.6) : .clear))
            )
            .overlay(alignment: .leading) {
                if isSelected {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Theme.accent)
                        .frame(width: 3, height: 18)
                        .padding(.leading, 2)
                }
            }
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
    }
}
