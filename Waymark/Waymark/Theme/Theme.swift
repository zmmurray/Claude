import SwiftUI

/// The look of Waymark: light, fresh, and questy. A pale-green canvas, near-white
/// cards, forest-green accents, and friendly rounded sans-serif type. Calm, never
/// busy — one clear thing at a time.
enum Theme {

    // MARK: Palette

    /// The pale-green canvas.
    static let bg        = Color(red: 0.933, green: 0.957, blue: 0.918)
    static let bgLow     = Color(red: 0.901, green: 0.937, blue: 0.878)
    /// Card / surface (essentially white with the faintest green warmth).
    static let surface   = Color(red: 0.996, green: 1.0,   blue: 0.992)
    static let surfaceHi = Color(red: 0.949, green: 0.972, blue: 0.937)
    /// Hairline strokes — a soft green-gray.
    static let hairline  = Color(red: 0.36, green: 0.46, blue: 0.40).opacity(0.16)
    static let hairlineHi = Color(red: 0.36, green: 0.46, blue: 0.40).opacity(0.28)

    /// Ink — deep pine, never pure black.
    static let ink       = Color(red: 0.114, green: 0.220, blue: 0.176)
    static let inkSoft   = Color(red: 0.290, green: 0.376, blue: 0.333)
    static let inkFaint  = Color(red: 0.522, green: 0.592, blue: 0.553)

    /// The accent — forest green for the focal action.
    static let accent    = Color(red: 0.180, green: 0.490, blue: 0.357)
    static let accentDeep = Color(red: 0.106, green: 0.353, blue: 0.255)
    /// A soft green wash for selected/tinted surfaces.
    static let accentWash = Color(red: 0.180, green: 0.490, blue: 0.357).opacity(0.12)
    /// A lighter moss, for secondary touches.
    static let moss      = Color(red: 0.435, green: 0.643, blue: 0.510)

    /// Used only for genuine urgency (overdue / due today). A muted clay, never orange.
    static let urgent    = Color(red: 0.745, green: 0.392, blue: 0.310)

    // MARK: Type — friendly rounded sans for headings; system sans for body.

    static func display(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }
    static let titleXL  = display(34, weight: .bold)
    static let titleL   = display(26, weight: .bold)
    static let titleM   = display(20, weight: .semibold)

    static let body     = Font.system(size: 14, weight: .regular)
    static let bodyMed  = Font.system(size: 14, weight: .medium)
    static let label    = Font.system(size: 12.5, weight: .medium)
    static let caption  = Font.system(size: 11.5, weight: .regular)
    static let eyebrow  = Font.system(size: 11, weight: .semibold, design: .rounded)

    // MARK: Metrics
    static let corner: CGFloat = 18
    static let cornerS: CGFloat = 11
    static let pad: CGFloat = 20
    static let gutter: CGFloat = 26
}

// MARK: - Reusable surface styling

/// The standard card: white fill, soft shadow, faint hairline. Light and airy.
struct CardBackground: ViewModifier {
    var raised: Bool = false
    var accentEdge: Color? = nil
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                    .strokeBorder(accentEdge ?? Theme.hairline, lineWidth: accentEdge == nil ? 1 : 1.5)
            )
            .shadow(color: Theme.ink.opacity(raised ? 0.10 : 0.06),
                    radius: raised ? 18 : 10, x: 0, y: raised ? 8 : 4)
    }
}

extension View {
    func card(raised: Bool = false, accentEdge: Color? = nil) -> some View {
        modifier(CardBackground(raised: raised, accentEdge: accentEdge))
    }
}

/// A small all-caps eyebrow label.
struct Eyebrow: View {
    let text: String
    var color: Color = Theme.inkFaint
    var body: some View {
        Text(text.uppercased())
            .font(Theme.eyebrow)
            .tracking(1.2)
            .foregroundStyle(color)
    }
}

/// The app's background: a soft vertical wash of greens.
struct AppBackground: View {
    var body: some View {
        LinearGradient(
            colors: [Theme.bg, Theme.bgLow],
            startPoint: .top, endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}
