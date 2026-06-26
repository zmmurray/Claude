import SwiftUI
import AppKit

@main
struct TockApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var store = TimerStore.shared

    var body: some Scene {
        MenuBarExtra {
            PanelView()
                .environmentObject(store)
        } label: {
            MenuBarLabel(store: store)
        }
        .menuBarExtraStyle(.window)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Menu-bar-only: no dock icon, no app switcher entry.
        NSApp.setActivationPolicy(.accessory)
        // Set up the notification delegate so the "Resume tracking" button works.
        _ = NotificationManager.shared
    }

    func applicationWillTerminate(_ notification: Notification) {
        // Preserve the real duration of an in-progress session on graceful quit.
        TimerStore.shared.finalizeRunningSessionForTermination()
    }
}
