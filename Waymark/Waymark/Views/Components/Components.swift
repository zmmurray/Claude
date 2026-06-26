import SwiftUI
import AppKit
import UniformTypeIdentifiers

/// The app backdrop: the user's chosen photo (washed for legibility) if set,
/// otherwise the built-in cinematic atmosphere.
struct AppBackdrop: View {
    @EnvironmentObject var store: DataStore
    var body: some View {
        ZStack {
            if let img = store.backgroundImage {
                Image(nsImage: img)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .overlay(
                        LinearGradient(colors: [Color.white.opacity(0.52), Color.white.opacity(0.34)],
                                       startPoint: .top, endPoint: .bottom)
                    )
                    .overlay(
                        RadialGradient(colors: [.clear, Theme.ink.opacity(0.14)],
                                       center: .center, startRadius: 280, endRadius: 820)
                    )
                    .clipped()
            } else {
                CinematicBackground()
            }
        }
        .ignoresSafeArea()
    }
}

/// Lets the user pick an image file for the backdrop. Returns the chosen URL.
@MainActor
func pickBackgroundImage() -> URL? {
    let panel = NSOpenPanel()
    panel.title = "Choose a background image"
    panel.allowedContentTypes = [.image]
    panel.allowsMultipleSelection = false
    panel.canChooseDirectories = false
    return panel.runModal() == .OK ? panel.url : nil
}

/// A quiet color-dot + name tag for a goal.
struct GoalChip: View {
    let goal: Goal
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(goal.color).frame(width: 7, height: 7)
            Text(goal.name).font(Theme.caption).foregroundStyle(Theme.inkSoft).lineLimit(1)
        }
        .padding(.horizontal, 9).padding(.vertical, 4)
        .background(Capsule().fill(goal.color.opacity(0.14)))
        .overlay(Capsule().strokeBorder(goal.color.opacity(0.30), lineWidth: 1))
    }
}

/// The quest's arc as a short row of dots.
struct StageIndicator: View {
    let stage: Stage
    var body: some View {
        HStack(spacing: 6) {
            ForEach(Stage.allCases) { s in
                Circle()
                    .fill(s.order <= stage.order ? Theme.accent.opacity(s == .done ? 1 : 0.8) : Theme.inkFaint.opacity(0.30))
                    .frame(width: 6, height: 6)
            }
            Text(stage.title).font(Theme.caption).foregroundStyle(Theme.inkSoft).padding(.leading, 4)
        }
    }
}

/// Importance shown as little leaves.
struct ImportanceLeaves: View {
    let importance: Int
    var body: some View {
        HStack(spacing: 3) {
            ForEach(1...5, id: \.self) { i in
                Image(systemName: i <= importance ? "leaf.fill" : "leaf")
                    .font(.system(size: 9))
                    .foregroundStyle(i <= importance ? Theme.accent.opacity(0.85) : Theme.inkFaint.opacity(0.4))
            }
        }
        .accessibilityLabel("Importance \(importance) of 5")
    }
}

/// A deadline shown the way it presses.
struct DeadlinePill: View {
    let deadline: Deadline
    var now: Date = Date()
    private var text: String {
        switch deadline.type {
        case .none: return "No deadline"
        case .hard, .soft:
            let kind = deadline.type == .hard ? "Due" : "Aim"
            guard let days = deadline.daysFromNow(now) else { return "\(kind) · someday" }
            if days < 0 { return "\(kind) · \(abs(days))d overdue" }
            if days == 0 { return "\(kind) · today" }
            if days == 1 { return "\(kind) · tomorrow" }
            return "\(kind) · \(days)d"
        }
    }
    private var tint: Color {
        switch deadline.type {
        case .none: return Theme.inkFaint
        case .soft: return Theme.inkSoft
        case .hard: return (deadline.daysFromNow(now) ?? 99) <= 2 ? Theme.urgent : Theme.inkSoft
        }
    }
    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: deadline.type == .none ? "infinity" : "calendar").font(.system(size: 9))
            Text(text).font(Theme.caption)
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 9).padding(.vertical, 4)
        .background(Capsule().fill(.ultraThinMaterial))
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.4), lineWidth: 1))
    }
}

/// The warm, weighty primary action — forest green, white text.
struct PrimaryActionButtonStyle: ButtonStyle {
    var big: Bool = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(big ? Theme.display(16, weight: .semibold) : Theme.bodyMed)
            .foregroundStyle(.white)
            .padding(.horizontal, big ? 26 : 18).padding(.vertical, big ? 14 : 10)
            .background(
                Capsule().fill(LinearGradient(colors: [Theme.accent, Theme.accentDeep],
                                              startPoint: .top, endPoint: .bottom))
            )
            .shadow(color: Theme.accent.opacity(configuration.isPressed ? 0.12 : 0.32),
                    radius: configuration.isPressed ? 5 : 14, x: 0, y: 6)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// A quiet, glassy secondary button.
struct QuietButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.bodyMed).foregroundStyle(Theme.inkSoft)
            .padding(.horizontal, 16).padding(.vertical, 9)
            .background(Capsule().fill(.ultraThinMaterial))
            .overlay(Capsule().strokeBorder(Color.white.opacity(configuration.isPressed ? 0.7 : 0.5), lineWidth: 1))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}
