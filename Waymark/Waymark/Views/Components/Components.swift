import SwiftUI

/// The quest's arc as a short row of dots — filled up to the current stage.
struct StageIndicator: View {
    let stage: Stage
    var body: some View {
        HStack(spacing: 6) {
            ForEach(Stage.allCases) { s in
                Circle()
                    .fill(s.order <= stage.order ? Theme.accent.opacity(s == .done ? 1 : 0.8) : Theme.inkFaint.opacity(0.28))
                    .frame(width: 6, height: 6)
            }
            Text(stage.title)
                .font(Theme.caption)
                .foregroundStyle(Theme.inkSoft)
                .padding(.leading, 4)
        }
    }
}

/// Importance shown as little leaves — quiet, on-theme, never a score.
struct ImportanceLeaves: View {
    let importance: Int
    var body: some View {
        HStack(spacing: 3) {
            ForEach(1...5, id: \.self) { i in
                Image(systemName: i <= importance ? "leaf.fill" : "leaf")
                    .font(.system(size: 9))
                    .foregroundStyle(i <= importance ? Theme.moss : Theme.inkFaint.opacity(0.4))
            }
        }
        .accessibilityLabel("Importance \(importance) of 5")
    }
}

/// A deadline shown the way it actually presses.
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
        case .hard:
            if let d = deadline.daysFromNow(now), d <= 2 { return Theme.urgent }
            return Theme.inkSoft
        }
    }

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: deadline.type == .none ? "infinity" : "calendar")
                .font(.system(size: 9))
            Text(text).font(Theme.caption)
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(Capsule().fill(Theme.surfaceHi))
        .overlay(Capsule().strokeBorder(Theme.hairline, lineWidth: 1))
    }
}

/// The warm, weighty primary action button — forest green, white text.
struct PrimaryActionButtonStyle: ButtonStyle {
    var big: Bool = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(big ? Theme.display(16, weight: .semibold) : Theme.bodyMed)
            .foregroundStyle(.white)
            .padding(.horizontal, big ? 24 : 18)
            .padding(.vertical, big ? 14 : 10)
            .background(
                RoundedRectangle(cornerRadius: big ? Theme.corner : Theme.cornerS, style: .continuous)
                    .fill(LinearGradient(colors: [Theme.accent, Theme.accentDeep],
                                         startPoint: .top, endPoint: .bottom))
            )
            .shadow(color: Theme.accent.opacity(configuration.isPressed ? 0.1 : 0.28),
                    radius: configuration.isPressed ? 4 : 12, x: 0, y: 5)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// A quiet secondary button.
struct QuietButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.bodyMed)
            .foregroundStyle(Theme.inkSoft)
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerS, style: .continuous)
                    .fill(configuration.isPressed ? Theme.surfaceHi : Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerS, style: .continuous)
                    .strokeBorder(Theme.hairlineHi, lineWidth: 1)
            )
    }
}

/// Section header: rounded title with an optional eyebrow above.
struct SectionHeader: View {
    let title: String
    var eyebrow: String? = nil
    var subtitle: String? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let eyebrow { Eyebrow(text: eyebrow) }
            Text(title).font(Theme.titleL).foregroundStyle(Theme.ink)
            if let subtitle {
                Text(subtitle).font(Theme.body).foregroundStyle(Theme.inkSoft)
            }
        }
    }
}
