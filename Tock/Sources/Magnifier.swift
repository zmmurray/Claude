import SwiftUI
import AppKit
import CoreGraphics
import ScreenCaptureKit
import Carbon.HIToolbox

/// A screen magnifier loupe: a rounded-rectangle lens that follows the cursor
/// and shows the area beneath it enlarged. Toggled with ⌥⌘M or the ⋯ menu.
/// Uses ScreenCaptureKit, so it needs one-time Screen Recording permission.
final class Magnifier: ObservableObject {
    static let shared = Magnifier()

    @Published private(set) var isActive = false
    @Published var zoom: Double {
        didSet { UserDefaults.standard.set(zoom, forKey: "magnifierZoom") }
    }

    private let lensSize = CGSize(width: 340, height: 230)

    private var window: NSPanel?
    private var contentLayer: CALayer?
    private var timer: Timer?
    private var capturing = false

    // Cached capture context.
    private var displays: [SCDisplay] = []
    private var selfApp: SCRunningApplication?

    // Global ⌥⌘M hotkey.
    private var hotKeyRef: EventHotKeyRef?
    private var handler: EventHandlerRef?

    private init() {
        let saved = UserDefaults.standard.double(forKey: "magnifierZoom")
        zoom = saved > 0 ? saved : 2.5
    }

    // MARK: Hotkey

    func installHotKey() {
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
                                 eventKind: UInt32(kEventHotKeyPressed))
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()
        InstallEventHandler(GetApplicationEventTarget(), { _, _, userData -> OSStatus in
            guard let userData else { return noErr }
            let me = Unmanaged<Magnifier>.fromOpaque(userData).takeUnretainedValue()
            DispatchQueue.main.async { me.toggle() }
            return noErr
        }, 1, &spec, selfPtr, &handler)

        let id = EventHotKeyID(signature: 0x544f434d /* 'TOCM' */, id: 1)
        RegisterEventHotKey(UInt32(kVK_ANSI_M), UInt32(cmdKey | optionKey),
                            id, GetApplicationEventTarget(), 0, &hotKeyRef)
    }

    // MARK: Toggle

    func toggle() { isActive ? stop() : start() }

    func start() {
        guard !isActive else { return }
        // Screen Recording permission is required to read screen pixels.
        if !CGPreflightScreenCaptureAccess() {
            if !CGRequestScreenCaptureAccess() {
                openScreenRecordingSettings()
                return
            }
        }
        isActive = true
        buildWindow()
        Task {
            let content = try? await SCShareableContent.current
            await MainActor.run {
                if let content {
                    self.displays = content.displays
                    self.selfApp = content.applications.first { $0.processID == getpid() }
                    self.startLoop()
                } else {
                    self.stop()
                    self.openScreenRecordingSettings()
                }
            }
        }
    }

    func stop() {
        isActive = false
        timer?.invalidate(); timer = nil
        window?.orderOut(nil); window = nil
        contentLayer = nil
    }

    // MARK: Lens window

    private func buildWindow() {
        let panel = NSPanel(contentRect: NSRect(origin: .zero, size: lensSize),
                            styleMask: [.borderless, .nonactivatingPanel],
                            backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.level = .screenSaver
        panel.ignoresMouseEvents = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]

        let host = NSView(frame: NSRect(origin: .zero, size: lensSize))
        host.wantsLayer = true
        let layer = CALayer()
        layer.frame = host.bounds
        layer.contentsGravity = .resizeAspectFill
        layer.cornerRadius = 22
        layer.masksToBounds = true
        layer.borderColor = NSColor.white.withAlphaComponent(0.55).cgColor
        layer.borderWidth = 2
        layer.backgroundColor = NSColor.black.withAlphaComponent(0.25).cgColor
        host.layer?.addSublayer(layer)

        panel.contentView = host
        self.contentLayer = layer
        self.window = panel
        panel.orderFrontRegardless()
    }

    // MARK: Capture loop

    private func startLoop() {
        timer?.invalidate()
        let timer = Timer(timeInterval: 1.0 / 50.0, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    private func tick() {
        guard isActive, let window else { return }
        let loc = NSEvent.mouseLocation
        guard let screen = NSScreen.screens.first(where: { NSMouseInRect(loc, $0.frame, false) })
                ?? NSScreen.main else { return }

        // Center the lens on the cursor.
        window.setFrameOrigin(CGPoint(x: loc.x - lensSize.width / 2,
                                      y: loc.y - lensSize.height / 2))

        if !capturing { capture(loc: loc, screen: screen) }
    }

    private func capture(loc: NSPoint, screen: NSScreen) {
        guard let displayID = screen.displayID,
              let scDisplay = displays.first(where: { $0.displayID == displayID }) else {
            refreshContent()
            return
        }
        capturing = true

        let scale = screen.backingScaleFactor
        let widthPts = lensSize.width / zoom
        let heightPts = lensSize.height / zoom

        // Cursor in display-local, top-left-origin points.
        let localX = loc.x - screen.frame.minX
        let localY = screen.frame.maxY - loc.y
        var rect = CGRect(x: localX - widthPts / 2, y: localY - heightPts / 2,
                          width: widthPts, height: heightPts)
        rect.origin.x = max(0, min(rect.origin.x, screen.frame.width - widthPts))
        rect.origin.y = max(0, min(rect.origin.y, screen.frame.height - heightPts))

        let config = SCStreamConfiguration()
        config.sourceRect = rect
        config.width = Int(lensSize.width * scale)
        config.height = Int(lensSize.height * scale)
        config.showsCursor = false

        let filter: SCContentFilter
        if let selfApp {
            filter = SCContentFilter(display: scDisplay,
                                     excludingApplications: [selfApp],
                                     exceptingWindows: [])
        } else {
            filter = SCContentFilter(display: scDisplay, excludingWindows: [])
        }

        Task { [weak self] in
            let image = try? await SCScreenshotManager.captureImage(contentFilter: filter,
                                                                    configuration: config)
            await MainActor.run {
                guard let self else { return }
                if let image {
                    self.contentLayer?.contentsScale = scale
                    self.contentLayer?.contents = image
                }
                self.capturing = false
            }
        }
    }

    private func refreshContent() {
        Task {
            let content = try? await SCShareableContent.current
            await MainActor.run {
                if let content {
                    self.displays = content.displays
                    self.selfApp = content.applications.first { $0.processID == getpid() }
                }
            }
        }
    }

    private func openScreenRecordingSettings() {
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
            NSWorkspace.shared.open(url)
        }
    }
}

extension NSScreen {
    var displayID: CGDirectDisplayID? {
        deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
    }
}
