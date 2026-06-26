import Foundation

/// A strategic track makes invisible long-game progress visible. One per axis.
/// It is *derived* from the progress-event log (never edited directly), so it can
/// never drift from reality. A track that isn't moving is the signal that a goal
/// is being neglected — surfaced continuously, not as a nag.
struct StrategicTrack: Identifiable {
    let axis: StrategicAxis
    let level: Int
    /// 0...1 toward the next level.
    let progress: Double
    let totalPoints: Int
    let pointsIntoLevel: Int
    let pointsForNextLevel: Int
    let lastProgress: Date?
    let eventCount: Int

    var id: String { axis.id }

    /// Points needed to *complete* a given level (1-indexed). Gently rising curve:
    /// 4, 6, 8, 10, ... so early levels feel reachable and later ones feel earned.
    static func cost(ofLevel level: Int) -> Int { 2 + level * 2 }

    /// Build a track from the events on this axis.
    static func make(axis: StrategicAxis, events: [ProgressEvent]) -> StrategicTrack {
        let axisEvents = events.filter { $0.axis == axis }
        let total = axisEvents.reduce(0) { $0 + $1.kind.points }

        var level = 1
        var remaining = total
        while remaining >= cost(ofLevel: level) {
            remaining -= cost(ofLevel: level)
            level += 1
        }
        let need = cost(ofLevel: level)
        let progress = need > 0 ? Double(remaining) / Double(need) : 0

        return StrategicTrack(
            axis: axis,
            level: level,
            progress: progress,
            totalPoints: total,
            pointsIntoLevel: remaining,
            pointsForNextLevel: need,
            lastProgress: axisEvents.map(\.date).max(),
            eventCount: axisEvents.count
        )
    }

    /// Days since the last meaningful progress on this axis, or nil if never.
    func daysSinceProgress(_ now: Date = Date()) -> Int? {
        guard let last = lastProgress else { return nil }
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: last), to: cal.startOfDay(for: now)).day
    }

    /// "Stalled" once a track with real history has gone quiet for two weeks.
    /// (A track that has never moved isn't stalled — it just hasn't begun.)
    func isStalled(_ now: Date = Date()) -> Bool {
        guard eventCount > 0, let days = daysSinceProgress(now) else { return false }
        return days >= 14
    }
}
