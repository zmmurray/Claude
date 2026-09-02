import SwiftUI
import AppKit
import Carbon.HIToolbox

/// A temporary system-wide Return/Enter hotkey. Uses Carbon's RegisterEventHotKey,
/// which needs no permission and works regardless of which app is focused. Active
/// only while a break warning is on screen, so Enter is reserved just for that.
final class ReturnHotKey {
    private var refs: [EventHotKeyRef?] = []
    private var handler: EventHandlerRef?
    private var action: (() -> Void)?
    private let signature: OSType = 0x544f434b   // 'TOCK'

    func begin(_ action: @escaping () -> Void) {
        end()
        self.action = action

        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
                                 eventKind: UInt32(kEventHotKeyPressed))
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()
        InstallEventHandler(GetApplicationEventTarget(), { _, _, userData -> OSStatus in
            guard let userData else { return noErr }
            let me = Unmanaged<ReturnHotKey>.fromOpaque(userData).takeUnretainedValue()
            DispatchQueue.main.async { me.action?() }
            return noErr
        }, 1, &spec, selfPtr, &handler)

        register(keyCode: UInt32(kVK_Return), id: 1)
        register(keyCode: UInt32(kVK_ANSI_KeypadEnter), id: 2)
    }

    private func register(keyCode: UInt32, id: UInt32) {
        var ref: EventHotKeyRef?
        let hotKeyID = EventHotKeyID(signature: signature, id: id)
        RegisterEventHotKey(keyCode, 0, hotKeyID, GetApplicationEventTarget(), 0, &ref)
        refs.append(ref)
    }

    func end() {
        for ref in refs where ref != nil { UnregisterEventHotKey(ref!) }
        refs.removeAll()
        if let handler { RemoveEventHandler(handler); self.handler = nil }
        action = nil
    }
}

/// Blurs whatever is behind a borderless/clear window for a frosted look.
struct VisualEffectBackdrop: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = .fullScreenUI
        view.blendingMode = .behindWindow
        view.state = .active
        return view
    }
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}

/// Hosts a SwiftUI view in a small floating panel pinned to the top-right corner.
/// If `onReturn` is provided, a temporary global Return hotkey triggers it — no
/// focus stealing, so the card never interrupts what you're typing.
final class CornerPanelController {
    private var panel: NSPanel?
    private let hotKey = ReturnHotKey()

    var isShowing: Bool { panel != nil }

    func show<V: View>(width: CGFloat, height: CGFloat, topOffset: CGFloat,
                       onReturn: (() -> Void)? = nil, view: V) {
        hide()
        guard let screen = NSScreen.main else { return }

        let panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: width, height: height),
                            styleMask: [.borderless, .nonactivatingPanel],
                            backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.contentView = NSHostingView(rootView: view)

        let visible = screen.visibleFrame
        panel.setFrameOrigin(NSPoint(x: visible.maxX - width - 18,
                                     y: visible.maxY - height - topOffset))
        self.panel = panel
        panel.orderFrontRegardless()

        if let onReturn {
            hotKey.begin(onReturn)
        }
    }

    func hide() {
        hotKey.end()
        panel?.orderOut(nil)
        panel = nil
    }
}

/// Hosts a SwiftUI view in a borderless full-screen window above other apps.
final class FullScreenOverlayController {
    private var window: NSWindow?

    var isShowing: Bool { window != nil }

    func show<V: View>(view: V) {
        hide()
        guard let screen = NSScreen.main else { return }

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

    func hide() {
        window?.orderOut(nil)
        window = nil
    }
}
