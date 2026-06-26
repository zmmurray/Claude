import SwiftUI

/// What shows up in the menu bar.
/// Idle: a plain stopwatch. Running: filled stopwatch + live H:MM:SS, ticking.
struct MenuBarLabel: View {
    @ObservedObject var store: TimerStore

    var body: some View {
        if store.isRunning {
            HStack(spacing: 4) {
                Image(systemName: "stopwatch.fill")
                Text(Format.liveClock(store.liveElapsed))
                    .monospacedDigit()
            }
        } else {
            Image(systemName: "stopwatch")
        }
    }
}
