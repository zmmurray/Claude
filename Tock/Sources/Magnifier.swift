import SwiftUI
import AppKit
import CoreGraphics
import Carbon.HIToolbox

/// A live screen magnifier loupe: a rounded-rectangle lens that follows the
/// cursor and shows the area beneath it enlarged, updated every frame. Toggled
/// with ⌥⌘M or the ⋯ menu. Captures the screen region *below* the lens window
/// (so it never mirrors itself); needs one-time Screen Recording permission.
final class Magnifier: ObservableObject {
    static let shared = Magnifier()

    @Published private(set) var isActive = false

    @Published var zoom: Double {
        didSet { UserDefaults.standard.set(zoom, forKey: "magnifierZoom") }
    }

    /// Lens width in points; height is 2:3 of this. Adjustable in the menu.
    @Published var lensWidth: Int {
        didSet {
            UserDefaults.standard.set(lensWidth, forKey: "magnifierWidth")
            if isActive { rebuildWindow() }
        }
    }

    private var lensSize: CGSize {
        CGSize(width: CGFloat(lensWidth), height: CGFloat(lensWidth) * 2 / 3)
    }

    private var window: NSPanel?
    private var contentLayer: CALayer?
    private var timer: Timer?

    private let signature: OSType = 0x544f434d   // 'TOCM'
    private var hotKeyRef: EventHotKeyRef?
    private var handler: EventHandlerRef?

    private init() {
        let z = UserDefaults.standard.double(forKey: "magnifierZoom")
        zoom = z > 0 ? z : 2.5
        let w = UserDefaults.standard.integer(forKey: "magnifierWidth")
        lensWidth = w > 0 ? w : 720
    }

    // MARK: Hotkey (⌥⌘M)

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
            if status == noErr && hkID.signature == 0x544f434d {
                let me = Unmanaged<Magnifier>.fromOpaque(userData).takeUnretainedValue()
                DispatchQueue.main.async { me.toggle() }
            }
            return noErr
        }, 1, &spec, selfPtr, &handler)

        let id = EventHotKeyID(signature: signature, id: 1)
        RegisterEventHotKey(UInt32(kVK_ANSI_M), UInt32(cmdKey | optionKey),
                            id, GetApplicationEventTarget(), 0, &hotKeyRef)
    }

    // MARK: Toggle

    func toggle() { isActive ? stop() : start() }

    func start() {
        guard !isActive else { return }
        if !CGPreflightScreenCaptureAccess() {
            if !CGRequestScreenCaptureAccess() {
                openScreenRecordingSettings()
                return
            }
        }
        isActive = true
        buildWindow()
        startLoop()
    }

    func stop() {
        isActive = false
        timer?.invalidate(); timer = nil
        window?.orderOut(nil); window = nil
        contentLayer = nil
    }

    private func rebuildWindow() {
        window?.orderOut(nil); window = nil; contentLayer = nil
        buildWindow()
    }

    // MARK: Lens window

    private func buildWindow() {
        let size = lensSize
        let panel = NSPanel(contentRect: NSRect(origin: .zero, size: size),
                            styleMask: [.borderless, .nonactivatingPanel],
                            backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.level = .screenSaver
        panel.ignoresMouseEvents = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]

        let host = NSView(frame: NSRect(origin: .zero, size: size))
        host.wantsLayer = true
        if let layer = host.layer {
            layer.contentsGravity = .resizeAspectFill
            layer.cornerRadius = 24
            layer.masksToBounds = true
            layer.borderColor = NSColor.white.withAlphaComponent(0.6).cgColor
            layer.borderWidth = 2
            layer.backgroundColor = NSColor.black.cgColor
            contentLayer = layer
        }

        panel.contentView = host
        self.window = panel
        panel.orderFrontRegardless()
    }

    // MARK: Capture loop

    private func startLoop() {
        timer?.invalidate()
        let timer = Timer(timeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    private func tick() {
        guard isActive, let window, let contentLayer else { return }
        let loc = NSEvent.mouseLocation
        let size = lensSize

        // Center the lens on the cursor.
        window.setFrameOrigin(CGPoint(x: loc.x - size.width / 2,
                                      y: loc.y - size.height / 2))

        // Region to magnify, in top-left-origin screen points around the cursor.
        let mainHeight = NSScreen.screens.first?.frame.height ?? NSScreen.main?.frame.height ?? 0
        let regionW = size.width / zoom
        let regionH = size.height / zoom
        let rect = CGRect(x: loc.x - regionW / 2,
                          y: (mainHeight - loc.y) - regionH / 2,
                          width: regionW, height: regionH)

        // Capture everything on screen *below* our lens window (excludes the lens).
        let winID = CGWindowID(window.windowNumber)
        guard let image = CGWindowListCreateImage(rect, .optionOnScreenBelowWindow,
                                                  winID, [.bestResolution]) else { return }

        // No implicit per-frame fade — keep it crisp and live.
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        contentLayer.contents = image
        contentLayer.contentsScale = NSScreen.main?.backingScaleFactor ?? 2
        CATransaction.commit()
    }

    private func openScreenRecordingSettings() {
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
            NSWorkspace.shared.open(url)
        }
    }
}
