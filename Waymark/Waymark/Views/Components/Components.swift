import SwiftUI

/// A muted axis tag with its wayfinding dot.
struct AxisChip: View {
    let axis: StrategicAxis
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(axis.color).frame(width: 7, height: 7)
            Text(axis.shortName)
                .font(Theme.caption)
                .foregroundStyle(Theme.inkSoft)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(Capsule().fill(axis.color.opacity(0.10)))
        .overlay(Capsule().strokeBorder(axis.color.opacity(0.22), lineWidth: 1))
    }
}

/// The quest's arc as a short row of dots — filled up to the current stage.
struct StageIndicator: View {
    let stage: Stage
    var tint: Color = Theme.accent
    var body: some View {
        HStack(spacing: 6) {
            ForEach(Stage.allCases) { s in
                Circle()
                    .fill(s.order <= stage.order ? tint.opacity(s == .done ? 1 : 0.85) : Theme.inkFaint.opacity(0.35))
                    .frame(width: 6, height: 6)
            }
            Text(stage.title)
                .font(Theme.caption)
                .foregroundStyle(Theme.inkSoft)
                .padding(.leading, 4)
        }
    }
}

/// Importance as five small marks. Quiet, not a score.
struct WeightDots: View {
    let weight: Int
    var body: some View {
        HStack(spacing: 3) {
            ForEach(1...5, id: \.self) { i in
                RoundedRectangle(cornerRadius: 1, style: .continuous)
                    .fill(i <= weight ? Theme.accent.opacity(0.9) : Theme.inkFaint.opacity(0.3))
                    .frame(width: 4, height: i <= weight ? 11 : 7)
            }
        }
        .accessibilityLabel("Strategic weight \(weight) of 5")
    }
}

/// A deadline shown the way it actually presses: hard/soft and how near.
struct DeadlinePill: View {
    let deadline: Deadline
    var now: Date = Date()

    private var text: String {
        switch deadline.type {
        case .none: return "No deadline"
        case .hard, .soft:
            let kind = deadline.type == .hard ? "Hard" : "Soft"
            guard let days = deadline.daysFromNow(now) else { return "\(kind) · no date" }
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
            if let d = deadline.daysFromNow(now), d <= 3 { return Theme.accent }
            return Theme.inkSoft
        }
    }

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: deadline.type == .none ? "infinity" : "flag.fill")
                .font(.system(size: 9))
            Text(text).font(Theme.caption)
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(Capsule().fill(Theme.surfaceHi.opacity(0.6)))
        .overlay(Capsule().strokeBorder(Theme.hairline, lineWidth: 1))
    }
}

/// The warm, weighty primary action button.
struct PrimaryActionButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.bodyMed)
            .foregroundStyle(Theme.base)
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerS, style: .continuous)
                    .fill(LinearGradient(colors: [Theme.accent, Theme.accentDeep],
                                         startPoint: .top, endPoint: .bottom))
            )
            .opacity(configuration.isPressed ? 0.82 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// A quiet secondary button — outline only.
struct QuietButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.bodyMed)
            .foregroundStyle(Theme.inkSoft)
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerS, style: .continuous)
                    .fill(Theme.surfaceHi.opacity(configuration.isPressed ? 0.9 : 0.5))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerS, style: .continuous)
                    .strokeBorder(Theme.hairlineHi, lineWidth: 1)
            )
    }
}

/// Section header used across views: serif title with an optional eyebrow above.
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
