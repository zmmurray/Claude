import SwiftUI

/// Waymark's look: a calm, cinematic, light-misty atmosphere with frosted-glass
/// panels floating over soft fog and light. Sans-serif, elegant, generous space —
/// one clear thing in view at a time.
enum Theme {

    // MARK: Atmosphere (the background gradient stops)
    static let skyTop = Color(red: 0.925, green: 0.953, blue: 0.925)
    static let skyMid = Color(red: 0.847, green: 0.906, blue: 0.867)
    static let skyLow = Color(red: 0.745, green: 0.835, blue: 0.800)
    /// A warm light glow and a cool mist, layered for depth.
    static let glowWarm = Color(red: 1.0, green: 0.972, blue: 0.918)
    static let glowCool = Color(red: 0.886, green: 0.945, blue: 0.949)

    // MARK: Ink
    static let ink      = Color(red: 0.137, green: 0.216, blue: 0.184)
    static let inkSoft  = Color(red: 0.290, green: 0.369, blue: 0.333)
    static let inkFaint = Color(red: 0.467, green: 0.537, blue: 0.494)

    // MARK: Accent — forest green for the focal action
    static let accent     = Color(red: 0.180, green: 0.490, blue: 0.357)
    static let accentDeep = Color(red: 0.106, green: 0.337, blue: 0.247)

    /// Calm, distinct hues auto-assigned to user-defined goals.
    static let goalPalette: [Color] = [
        Color(red: 0.435, green: 0.663, blue: 0.541), // moss
        Color(red: 0.306, green: 0.553, blue: 0.553), // teal
        Color(red: 0.431, green: 0.525, blue: 0.690), // slate blue
        Color(red: 0.580, green: 0.529, blue: 0.722), // lavender
        Color(red: 0.788, green: 0.635, blue: 0.310), // amber-gold
        Color(red: 0.690, green: 0.420, blue: 0.345)  // rust
    ]
    static func goalColor(_ index: Int) -> Color {
        goalPalette[((index % goalPalette.count) + goalPalette.count) % goalPalette.count]
    }

    /// Used only for genuine urgency. A muted clay, never neon.
    static let urgent = Color(red: 0.745, green: 0.392, blue: 0.310)

    // MARK: Type — clean sans, light & airy, with tracking on big headings.
    static func display(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
    static let titleXL = display(36, weight: .semibold)
    static let titleL  = display(27, weight: .semibold)
    static let titleM  = display(20, weight: .medium)

    static let body    = Font.system(size: 14.5, weight: .regular)
    static let bodyMed = Font.system(size: 14.5, weight: .medium)
    static let label   = Font.system(size: 12.5, weight: .medium)
    static let caption = Font.system(size: 11.5, weight: .regular)
    static let eyebrow = Font.system(size: 11, weight: .semibold)

    // MARK: Metrics
    static let corner: CGFloat = 22
    static let cornerS: CGFloat = 12
}

// MARK: - Cinematic background

/// The atmospheric backdrop: layered fog, a soft warm light, a cool mist, and a
/// gentle vignette for depth. Self-contained — no image assets required.
struct CinematicBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [Theme.skyTop, Theme.skyMid, Theme.skyLow],
                           startPoint: .top, endPoint: .bottom)

            RadialGradient(colors: [Theme.glowWarm.opacity(0.75), .clear],
                           center: .init(x: 0.82, y: 0.12), startRadius: 0, endRadius: 560)

            RadialGradient(colors: [Theme.glowCool.opacity(0.55), .clear],
                           center: .init(x: 0.1, y: 0.9), startRadius: 0, endRadius: 520)

            RadialGradient(colors: [.clear, Theme.ink.opacity(0.10)],
                           center: .center, startRadius: 280, endRadius: 820)
        }
        .ignoresSafeArea()
    }
}

// MARK: - Frosted glass surfaces

/// A floating panel. Near-solid and high-contrast so text stays crisp — the
/// cinematic atmosphere lives in the background, not smeared across the content.
struct GlassCard: ViewModifier {
    var strong: Bool = false
    var accentEdge: Color? = nil
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                    .fill(Color.white.opacity(strong ? 0.97 : 0.92))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                    .strokeBorder(accentEdge ?? Color.white.opacity(0.9), lineWidth: accentEdge == nil ? 1 : 1.6)
                    .allowsHitTesting(false)
            )
            .shadow(color: Theme.ink.opacity(strong ? 0.18 : 0.12), radius: strong ? 24 : 14, x: 0, y: strong ? 12 : 7)
    }
}

extension View {
    func glass(strong: Bool = false, accentEdge: Color? = nil) -> some View {
        modifier(GlassCard(strong: strong, accentEdge: accentEdge))
    }
}

/// Small all-caps eyebrow label.
struct Eyebrow: View {
    let text: String
    var color: Color = Theme.inkFaint
    var body: some View {
        Text(text.uppercased())
            .font(Theme.eyebrow).tracking(1.6).foregroundStyle(color)
    }
}
