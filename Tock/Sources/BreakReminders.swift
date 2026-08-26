import SwiftUI
import AppKit

/// The two kinds of break the reminder shows.
enum BreakKind: Equatable {
    case eye
    case move

    var title: String {
        switch self {
        case .eye:  return "Look away"
        case .move: return "Time to move"
        }
    }

    var message: String {
        switch self {
        case .eye:  return "Rest your eyes — focus on something about 20 feet away."
        case .move: return "Step away from the screen and stretch for 5 minutes."
        }
    }

    var subtitle: String {
        switch self {
        case .eye:  return "20-second eye break"
        case .move: return "5-minute movement break"
        }
    }

    var systemImage: String {
        switch self {
        case .eye:  return "eye"
        case .move: return "figure.walk"
        }
    }

    /// Countdown length, in seconds.
    var duration: Int {
        switch self {
        case .eye:  return 20
        case .move: return 300
        }
    }

    var tint: Color {
        switch self {
        case .eye:  return Color(red: 0.30, green: 0.80, blue: 0.78)   // teal
        case .move: return Color(red: 1.00, green: 0.62, blue: 0.28)   // amber
        }
    }
}

// MARK: - Scheduler

/// Fires the eye break every 20 min and the movement break every 90 min, whether
/// or not a project is being timed. Toggle persists in UserDefaults.
final class BreakScheduler: ObservableObject {
    static let shared = BreakScheduler()

    @Published var enabled: Bool {
        didSet {
            UserDefaults.standard.set(enabled, forKey: "breaksEnabled")
            reschedule()
        }
    }

    private let eyeInterval: TimeInterval = 20 * 60
    private let moveInterval: TimeInterval = 90 * 60
    private var eyeTimer: Timer?
    private var moveTimer: Timer?

    private init() {
        // Default on the first time (the feature was explicitly requested).
        if UserDefaults.standard.object(forKey: "breaksEnabled") == nil {
            enabled = true
        } else {
            enabled = UserDefaults.standard.bool(forKey: "breaksEnabled")
        }
    }

    func start() { reschedule() }

    private func reschedule() {
        eyeTimer?.invalidate(); eyeTimer = nil
        moveTimer?.invalidate(); moveTimer = nil
        guard enabled else { return }
        eyeTimer = repeatingTimer(eyeInterval) { [weak self] in self?.fire(.eye) }
        moveTimer = repeatingTimer(moveInterval) { [weak self] in self?.fire(.move) }
    }

    private func repeatingTimer(_ interval: TimeInterval, _ action: @escaping () -> Void) -> Timer {
        let timer = Timer(timeInterval: interval, repeats: true) { _ in action() }
        RunLoop.main.add(timer, forMode: .common)
        return timer
    }

    private func fire(_ kind: BreakKind) {
        guard enabled, !BreakOverlayController.shared.isShowing else { return }
        if kind == .move {
            // A movement break rests the eyes too — restart the 20-minute clock.
            eyeTimer?.invalidate()
            eyeTimer = repeatingTimer(eyeInterval) { [weak self] in self?.fire(.eye) }
        }
        present(kind)
    }

    private func present(_ kind: BreakKind) {
        let onSnooze: (() -> Void)? = kind == .move ? { [weak self] in self?.snoozeMove() } : nil
        BreakOverlayController.shared.present(kind: kind, onSnooze: onSnooze)
    }

    private func snoozeMove() {
        moveTimer?.invalidate()
        let timer = Timer(timeInterval: 5 * 60, repeats: false) { [weak self] _ in
            self?.fire(.move)
            // Resume the normal 90-minute cadence afterwards.
            self?.moveTimer?.invalidate()
            self?.moveTimer = self?.repeatingTimer(self?.moveInterval ?? 5400) { [weak self] in
                self?.fire(.move)
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        moveTimer = timer
    }

    /// Show a break right now (used by the "Take a break now" menu items).
    func triggerNow(_ kind: BreakKind) {
        BreakOverlayController.shared.dismiss()
        present(kind)
    }
}

// MARK: - Overlay window

/// Owns the borderless full-screen window the break overlay lives in.
final class BreakOverlayController {
    static let shared = BreakOverlayController()
    private var window: NSWindow?

    var isShowing: Bool { window != nil }

    func present(kind: BreakKind, onSnooze: (() -> Void)? = nil) {
        dismiss()
        guard let screen = NSScreen.main else { return }

        let view = BreakOverlayView(kind: kind, onSnooze: onSnooze) { [weak self] in
            self?.dismiss()
        }
        let window = NSWindow(contentRect: screen.frame,
                              styleMask: .borderless,
                              backing: .buffered,
                              defer: false)
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .screenSaver
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        window.contentView = NSHostingView(rootView: view)
        window.setFrame(screen.frame, display: true)

        self.window = window
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
    }

    func dismiss() {
        window?.orderOut(nil)
        window = nil
    }
}

// MARK: - Overlay view

/// Frosted full-screen backdrop with a centered countdown card.
struct BreakOverlayView: View {
    let kind: BreakKind
    let onSnooze: (() -> Void)?
    let onClose: () -> Void

    @State private var remaining: Int
    @State private var appeared = false
    @State private var done = false

    init(kind: BreakKind, onSnooze: (() -> Void)? = nil, onClose: @escaping () -> Void) {
        self.kind = kind
        self.onSnooze = onSnooze
        self.onClose = onClose
        _remaining = State(initialValue: kind.duration)
    }

    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            VisualEffectBackdrop().ignoresSafeArea()
            Color.black.opacity(0.30).ignoresSafeArea()
            card
                .scaleEffect(appeared ? 1 : 0.92)
                .opacity(appeared ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) { appeared = true }
        }
        .onExitCommand { close() }
        .onReceive(tick) { _ in
            guard !done else { return }
            if remaining > 1 {
                remaining -= 1
            } else {
                remaining = 0
                finish()
            }
        }
    }

    private var progress: Double {
        Double(remaining) / Double(kind.duration)
    }

    private var timeString: String {
        if kind.duration >= 60 {
            return String(format: "%d:%02d", remaining / 60, remaining % 60)
        }
        return "\(remaining)"
    }

    private var card: some View {
        VStack(spacing: 24) {
            ring
            VStack(spacing: 8) {
                Text(done ? "Nice work" : kind.title)
                    .font(.system(size: 30, weight: .bold))
                Text(done ? "You're all set — back to it." : kind.message)
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if !done {
                HStack(spacing: 12) {
                    Button("Skip") { close() }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                    if kind == .move {
                        Button("Snooze 5 min") {
                            onSnooze?()
                            close()
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                    }
                    Button(kind == .eye ? "Done" : "I'm back") { finish() }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .tint(kind.tint)
                }
                .padding(.top, 4)
            }
        }
        .padding(44)
        .frame(width: 460)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(.white.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.45), radius: 34, y: 14)
    }

    private var ring: some View {
        ZStack {
            Circle()
                .stroke(.white.opacity(0.12), lineWidth: 9)
            Circle()
                .trim(from: 0, to: done ? 1 : progress)
                .stroke(kind.tint, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.linear(duration: 1), value: remaining)
            if done {
                Image(systemName: "checkmark")
                    .font(.system(size: 46, weight: .bold))
                    .foregroundStyle(kind.tint)
            } else {
                VStack(spacing: 4) {
                    Image(systemName: kind.systemImage)
                        .font(.system(size: 30, weight: .medium))
                        .foregroundStyle(kind.tint)
                    Text(timeString)
                        .font(.system(size: 28, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                }
            }
        }
        .frame(width: 156, height: 156)
    }

    private func finish() {
        guard !done else { return }
        withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) { done = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { close() }
    }

    private func close() {
        withAnimation(.easeIn(duration: 0.2)) { appeared = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { onClose() }
    }
}

/// Blurs whatever is behind the borderless window for a frosted look.
private struct VisualEffectBackdrop: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = .fullScreenUI
        view.blendingMode = .behindWindow
        view.state = .active
        return view
    }
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}
