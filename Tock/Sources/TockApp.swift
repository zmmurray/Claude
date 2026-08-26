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
                .environmentObject(BreakScheduler.shared)
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
        // Always dark, regardless of the system appearance setting.
        NSApp.appearance = NSAppearance(named: .darkAqua)
        // Set up the notification delegate so the "Resume tracking" button works.
        _ = NotificationManager.shared
        // Begin the 20-min eye / 90-min movement break reminders (if enabled).
        BreakScheduler.shared.start()
    }

    func applicationWillTerminate(_ notification: Notification) {
        // Preserve the real duration of an in-progress session on graceful quit.
        TimerStore.shared.finalizeRunningSessionForTermination()
    }
}
