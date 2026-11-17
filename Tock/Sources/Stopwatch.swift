import SwiftUI
import AppKit
import Carbon.HIToolbox

/// A dead-simple count-up stopwatch, independent of project tracking.
/// Start/stop/reset from the panel, or toggle from anywhere with ⌥⌘S.
final class Stopwatch: ObservableObject {
    static let shared = Stopwatch()

    @Published private(set) var running = false
    /// Ticked every second while running so the UI refreshes.
    @Published var now = Date()

    private var accumulated: TimeInterval = 0
    private var startDate: Date?
    private var ticker: Timer?

    private let signature: OSType = 0x544f4353   // 'TOCS'
    private var hotKeyRef: EventHotKeyRef?
    private var handler: EventHandlerRef?

    private init() {}

    /// Elapsed time, computed from timestamps (correct across sleep/wake).
    var elapsed: TimeInterval {
        if running, let startDate {
            return accumulated + now.timeIntervalSince(startDate)
        }
        return accumulated
    }

    func toggle() { running ? stop() : start() }

    func start() {
        guard !running else { return }
        startDate = Date()
        now = Date()
        running = true
        let ticker = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.now = Date()
        }
        RunLoop.main.add(ticker, forMode: .common)
        self.ticker = ticker
    }

    func stop() {
        guard running else { return }
        accumulated = elapsed
        startDate = nil
        running = false
        ticker?.invalidate(); ticker = nil
    }

    func reset() {
        ticker?.invalidate(); ticker = nil
        running = false
        startDate = nil
        accumulated = 0
        now = Date()
    }

    // MARK: Global ⌥⌘S hotkey

    func installHotKey() {
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
                                 eventKind: UInt32(kEventHotKeyPressed))
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()
        InstallEventHandler(GetApplicationEventTarget(), { _, event, userData -> OSStatus in
            guard let userData, let event else { return noErr }
            var hkID = EventHotKeyID()
            let status = GetEventParameter(event, EventParamName(kEventParamDirectObject),
                                           EventParamType(typeEventHotKeyID), nil,
                                           MemoryLayout<EventHotKeyID>.size, nil, &hkID)
            if status == noErr && hkID.signature == 0x544f4353 {
                let me = Unmanaged<Stopwatch>.fromOpaque(userData).takeUnretainedValue()
                DispatchQueue.main.async { me.toggle() }
            }
            return noErr
        }, 1, &spec, selfPtr, &handler)

        let id = EventHotKeyID(signature: signature, id: 1)
        RegisterEventHotKey(UInt32(kVK_ANSI_S), UInt32(cmdKey | optionKey),
                            id, GetApplicationEventTarget(), 0, &hotKeyRef)
    }
}
