import SwiftUI
import AppKit

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
/// If `onReturn` is provided the panel becomes key and Return triggers it.
final class CornerPanelController {
    private var panel: NSPanel?
    private var monitor: Any?

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
            panel.makeKey()
            monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
                if event.keyCode == 36 || event.keyCode == 76 {   // Return / keypad Enter
                    onReturn()
                    return nil
                }
                return event
            }
        }
    }

    func hide() {
        if let monitor { NSEvent.removeMonitor(monitor) }
        monitor = nil
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
