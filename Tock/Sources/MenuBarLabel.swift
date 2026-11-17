import SwiftUI

/// What shows up in the menu bar.
/// Project timer running: filled stopwatch + live H:MM:SS.
/// Else stopwatch running: a timer glyph + its elapsed time.
/// Else: a plain stopwatch.
struct MenuBarLabel: View {
    @ObservedObject var store: TimerStore
    @ObservedObject var stopwatch: Stopwatch

    var body: some View {
        if store.isRunning {
            HStack(spacing: 4) {
                Image(systemName: "stopwatch.fill")
                Text(Format.liveClock(store.liveElapsed))
                    .monospacedDigit()
            }
        } else if stopwatch.running {
            HStack(spacing: 4) {
                Image(systemName: "timer")
                Text(Format.liveClock(stopwatch.elapsed))
                    .monospacedDigit()
            }
        } else {
            Image(systemName: "stopwatch")
        }
    }
}
