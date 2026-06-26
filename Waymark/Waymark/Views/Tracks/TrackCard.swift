import SwiftUI

struct TrackCard: View {
    let track: StrategicTrack
    let questCount: Int

    private var lastActivityText: String {
        guard let days = track.daysSinceProgress() else { return "No progress yet" }
        switch days {
        case 0: return "Advanced today"
        case 1: return "Advanced yesterday"
        default: return "Last advanced \(days) days ago"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Eyebrow(text: track.axis.shortName, color: track.axis.color, dot: track.axis.color)
                    Text(track.axis.blurb)
                        .font(Theme.caption).foregroundStyle(Theme.inkSoft)
                }
                Spacer()
                levelBadge
            }

            // Progress toward next level
            VStack(alignment: .leading, spacing: 7) {
                ProgressTrackBar(progress: track.progress, tint: track.axis.color)
                HStack {
                    Text("\(track.pointsIntoLevel) / \(track.pointsForNextLevel) to level \(track.level + 1)")
                        .font(Theme.caption).foregroundStyle(Theme.inkFaint)
                    Spacer()
                    Text("\(track.eventCount) milestone\(track.eventCount == 1 ? "" : "s")")
                        .font(Theme.caption).foregroundStyle(Theme.inkFaint)
                }
            }

            Divider().overlay(Theme.hairline)

            // Footer: liveliness signal
            HStack(spacing: 8) {
                Image(systemName: track.isStalled() ? "moon.zzz" : "leaf")
                    .font(.system(size: 11))
                    .foregroundStyle(track.isStalled() ? track.axis.color : Theme.inkSoft)
                Text(lastActivityText)
                    .font(Theme.caption)
                    .foregroundStyle(track.isStalled() ? track.axis.color : Theme.inkSoft)
                Spacer()
                Text("\(questCount) active")
                    .font(Theme.caption).foregroundStyle(Theme.inkFaint)
            }
        }
        .padding(20)
        .card(accentEdge: track.isStalled() ? track.axis.color.opacity(0.3) : nil)
    }

    private var levelBadge: some View {
        VStack(spacing: 0) {
            Text("\(track.level)")
                .font(Theme.display(28, weight: .semibold))
                .foregroundStyle(Theme.ink)
            Text("LEVEL")
                .font(.system(size: 8, weight: .semibold)).tracking(1.5)
                .foregroundStyle(Theme.inkFaint)
        }
        .frame(width: 58, height: 58)
        .background(
            Circle().fill(track.axis.color.opacity(0.12))
        )
        .overlay(Circle().strokeBorder(track.axis.color.opacity(0.35), lineWidth: 1.5))
    }
}

/// A slim progress bar with a soft glow on the filled portion.
struct ProgressTrackBar: View {
    let progress: Double   // 0...1
    let tint: Color
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.surfaceHi)
                Capsule()
                    .fill(LinearGradient(colors: [tint.opacity(0.75), tint],
                                         startPoint: .leading, endPoint: .trailing))
                    .frame(width: max(6, geo.size.width * CGFloat(min(1, max(0, progress)))))
                    .shadow(color: tint.opacity(0.5), radius: 5)
            }
        }
        .frame(height: 8)
        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: progress)
    }
}
