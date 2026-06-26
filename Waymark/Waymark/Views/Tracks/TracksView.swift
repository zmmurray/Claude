import SwiftUI

struct TracksView: View {
    @EnvironmentObject var store: DataStore

    private var stalled: [StrategicTrack] {
        store.tracks.filter { $0.isStalled() }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.gutter) {
                SectionHeader(
                    title: "Strategic Tracks",
                    eyebrow: "The long game",
                    subtitle: "Each axis advances only on meaningful progress. A track standing still is the signal you're neglecting a goal — quietly, continuously, never as a nag."
                )

                if let s = stalled.first {
                    stalledBanner(s)
                }

                LazyVGrid(columns: [GridItem(.flexible(), spacing: 16),
                                    GridItem(.flexible(), spacing: 16)], spacing: 16) {
                    ForEach(store.tracks) { track in
                        TrackCard(track: track, questCount: questCount(track.axis))
                    }
                }
            }
            .frame(maxWidth: 860, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.horizontal, 48)
            .padding(.vertical, 44)
        }
        .scrollIndicators(.hidden)
    }

    private func questCount(_ axis: StrategicAxis) -> Int {
        store.quests.filter { $0.axis == axis && !$0.isDone }.count
    }

    private func stalledBanner(_ track: StrategicTrack) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "moon.zzz")
                .font(.system(size: 16)).foregroundStyle(track.axis.color)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(track.axis.shortName) has gone quiet")
                    .font(Theme.bodyMed).foregroundStyle(Theme.ink)
                Text("No meaningful progress in \(track.daysSinceProgress() ?? 0) days. \(track.axis.blurb) Worth a glance.")
                    .font(Theme.caption).foregroundStyle(Theme.inkSoft)
            }
            Spacer()
        }
        .padding(16)
        .card(accentEdge: track.axis.color.opacity(0.35))
    }
}
