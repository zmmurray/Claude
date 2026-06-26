import SwiftUI

/// The look of Waymark: a calm, cinematic expedition journal. Dark, generous,
/// one warm accent. Defined in code so the palette is in one legible place.
enum Theme {

    // MARK: Palette — warm-tinted near-black, off-white ink, a single amber accent.

    /// The deepest background tone.
    static let base       = Color(red: 0.066, green: 0.063, blue: 0.058)
    /// A second tone for the subtle vertical gradient.
    static let baseLow    = Color(red: 0.045, green: 0.043, blue: 0.040)
    /// Card / surface fill.
    static let surface    = Color(red: 0.108, green: 0.103, blue: 0.096)
    /// Raised surface (hover, selection).
    static let surfaceHi  = Color(red: 0.140, green: 0.134, blue: 0.124)
    /// Hairline strokes.
    static let hairline   = Color.white.opacity(0.07)
    static let hairlineHi = Color.white.opacity(0.12)

    static let ink        = Color(white: 0.94)
    static let inkSoft    = Color(white: 0.66)
    static let inkFaint   = Color(white: 0.42)

    /// The one warm accent — reserved for the focal action and earned moments.
    static let accent     = Color(red: 0.902, green: 0.667, blue: 0.349) // amber / brass
    static let accentDeep = Color(red: 0.78,  green: 0.54,  blue: 0.26)

    // MARK: Type — a serif display face for headers gives the journal hand;
    // body stays in the system face for clarity.

    static func display(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }
    static let titleXL  = display(34, weight: .semibold)
    static let titleL   = display(26, weight: .semibold)
    static let titleM   = display(20, weight: .medium)

    static let body     = Font.system(size: 14, weight: .regular)
    static let bodyMed  = Font.system(size: 14, weight: .medium)
    static let label    = Font.system(size: 12, weight: .medium)
    static let caption  = Font.system(size: 11, weight: .regular)
    /// Small all-caps eyebrow text.
    static let eyebrow  = Font.system(size: 10.5, weight: .semibold).width(.expanded)

    // MARK: Metrics
    static let corner: CGFloat = 14
    static let cornerS: CGFloat = 9
    static let pad: CGFloat = 20
    static let gutter: CGFloat = 28
}

// MARK: - Reusable surface styling

/// The standard card: soft fill, hairline edge, gentle depth.
struct CardBackground: ViewModifier {
    var raised: Bool = false
    var accentEdge: Color? = nil
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                    .fill(raised ? Theme.surfaceHi : Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                    .strokeBorder(accentEdge ?? Theme.hairline, lineWidth: accentEdge == nil ? 1 : 1.2)
            )
    }
}

extension View {
    func card(raised: Bool = false, accentEdge: Color? = nil) -> some View {
        modifier(CardBackground(raised: raised, accentEdge: accentEdge))
    }
}

/// A small all-caps eyebrow label, optionally with a leading color dot.
struct Eyebrow: View {
    let text: String
    var color: Color = Theme.inkFaint
    var dot: Color? = nil
    var body: some View {
        HStack(spacing: 6) {
            if let dot {
                Circle().fill(dot).frame(width: 7, height: 7)
            }
            Text(text.uppercased())
                .font(Theme.eyebrow)
                .tracking(1.4)
                .foregroundStyle(color)
        }
    }
}

/// The app's background: a quiet vertical gradient, never flat.
struct AppBackground: View {
    var body: some View {
        LinearGradient(
            colors: [Theme.base, Theme.baseLow],
            startPoint: .top, endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}
