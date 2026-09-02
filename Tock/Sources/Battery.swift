import Foundation
import SwiftUI
import AppKit
import IOKit.ps

/// A snapshot of the current power state.
struct BatterySnapshot {
    var onAC = true
    var charging = false
    var percent: Int?
    var seconds: Int?   // estimated time to empty while discharging; nil if unknown/AC
}

/// Polls the system's own time-to-empty estimate and surfaces a corner countdown
/// when low and a full-screen overlay when critical. Runs independently of timing.
final class BatteryMonitor: ObservableObject {
    static let shared = BatteryMonitor()

    @Published var enabled: Bool {
        didSet {
            UserDefaults.standard.set(enabled, forKey: "batteryAlertsEnabled")
            reschedule()
        }
    }
    @Published private(set) var snapshot = BatterySnapshot()

    private let lowSeconds = 20 * 60     // show corner card at/under 20 minutes
    private let criticalSeconds = 60     // full-screen overlay at/under 60 seconds
    private var timer: Timer?
    private let corner = CornerPanelController()
    private let critical = FullScreenOverlayController()

    private init() {
        if UserDefaults.standard.object(forKey: "batteryAlertsEnabled") == nil {
            enabled = true
        } else {
            enabled = UserDefaults.standard.bool(forKey: "batteryAlertsEnabled")
        }
    }

    func start() { reschedule() }

    private func reschedule() {
        timer?.invalidate(); timer = nil
        guard enabled else {
            corner.hide(); critical.hide()
            return
        }
        poll()
        let timer = Timer(timeInterval: 15, repeats: true) { [weak self] _ in self?.poll() }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    private func poll() {
        let snap = Self.read()
        snapshot = snap
        guard enabled else { return }

        // Plugged in (or charging): clear everything.
        if snap.onAC || snap.charging {
            corner.hide(); critical.hide()
            return
        }

        guard let seconds = snap.seconds else {
            corner.hide(); critical.hide()
            return
        }

        if seconds <= criticalSeconds {
            corner.hide()
            if !critical.isShowing {
                critical.show(view: BatteryCriticalView(onDismiss: { [weak self] in self?.critical.hide() })
                    .environmentObject(self))
            }
        } else if seconds <= lowSeconds {
            critical.hide()
            if !corner.isShowing {
                corner.show(width: 300, height: 76, topOffset: 112,
                            view: BatteryCornerView().environmentObject(self))
            }
        } else {
            corner.hide(); critical.hide()
        }
    }

    /// Human-readable current estimate for the menu.
    var menuText: String {
        let snap = snapshot
        if snap.charging { return "Battery: charging" }
        if snap.onAC { return "Battery: on power" }
        if let seconds = snap.seconds { return "Battery: ~\(Self.short(seconds)) left" }
        if let percent = snap.percent { return "Battery: \(percent)%" }
        return "Battery: estimating…"
    }

    static func short(_ seconds: Int) -> String {
        let minutes = max(0, seconds) / 60
        if minutes >= 60 { return "\(minutes / 60)h \(minutes % 60)m" }
        if minutes >= 1 { return "\(minutes)m" }
        return "\(max(0, seconds))s"
    }

    static func read() -> BatterySnapshot {
        var snap = BatterySnapshot()
        let remaining = IOPSGetTimeRemainingEstimate()

        let blob = IOPSCopyPowerSourcesInfo().takeRetainedValue()
        let list = IOPSCopyPowerSourcesList(blob).takeRetainedValue() as [CFTypeRef]
        for source in list {
            guard let desc = IOPSGetPowerSourceDescription(blob, source)?
                .takeUnretainedValue() as? [String: Any] else { continue }
            snap.percent = desc[kIOPSCurrentCapacityKey as String] as? Int
            let state = desc[kIOPSPowerSourceStateKey as String] as? String
            snap.onAC = (state == (kIOPSACPowerValue as String))
            snap.charging = (desc[kIOPSIsChargingKey as String] as? Bool) ?? false
            break
        }

        // IOKit sentinels: -2 = on AC (unlimited), -1 = still calculating.
        if remaining == -2 {
            snap.onAC = true
        } else if remaining == -1 {
            snap.seconds = nil
        } else if remaining > 0 {
            snap.seconds = Int(remaining)
        }
        return snap
    }
}

/// Compact corner card with a live "plug in soon" estimate.
struct BatteryCornerView: View {
    @EnvironmentObject var monitor: BatteryMonitor

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Color.orange.opacity(0.18)).frame(width: 42, height: 42)
                Image(systemName: "battery.25")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(.orange)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Plug in soon")
                    .font(.subheadline.weight(.semibold))
                Text("~\(BatteryMonitor.short(monitor.snapshot.seconds ?? 0)) of battery left")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 4)
        }
        .padding(12)
        .frame(width: 300)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(.orange.opacity(0.35), lineWidth: 1)
        )
    }
}

/// Full-screen critical warning shown under ~60 seconds of battery.
struct BatteryCriticalView: View {
    @EnvironmentObject var monitor: BatteryMonitor
    let onDismiss: () -> Void
    @State private var appeared = false

    private var subtitle: String {
        if let seconds = monitor.snapshot.seconds {
            return "About \(max(0, seconds)) seconds of battery left."
        }
        return "Your battery is critically low."
    }

    var body: some View {
        ZStack {
            VisualEffectBackdrop().ignoresSafeArea()
            Color.black.opacity(0.35).ignoresSafeArea()

            VStack(spacing: 22) {
                ZStack {
                    Circle().stroke(.white.opacity(0.12), lineWidth: 9)
                    Image(systemName: "bolt.slash.fill")
                        .font(.system(size: 46, weight: .bold))
                        .foregroundStyle(.red)
                }
                .frame(width: 150, height: 150)

                VStack(spacing: 8) {
                    Text("Plug in now")
                        .font(.system(size: 30, weight: .bold))
                    Text(subtitle)
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }

                Button("Dismiss") { onDismiss() }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
            }
            .padding(44)
            .frame(width: 460)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .stroke(.red.opacity(0.45), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.45), radius: 34, y: 14)
            .scaleEffect(appeared ? 1 : 0.92)
            .opacity(appeared ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) { appeared = true }
        }
    }
}
