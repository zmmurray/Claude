import SwiftUI

/// THE most important behavior: once the important thing is done, the day rests.
/// No next twelve tasks — a calm recap and permission to go live your life.
struct EnoughView: View {
    @EnvironmentObject var store: DataStore
    @Binding var revealMore: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            // The mark
            VStack(alignment: .leading, spacing: 14) {
                ZStack {
                    Circle().fill(Theme.accentWash).frame(width: 56, height: 56)
                    Image(systemName: "checkmark")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(Theme.accent)
                }
                Text("That's enough for today.")
                    .font(Theme.titleL).foregroundStyle(Theme.ink)
                Text("You moved what mattered. The rest can wait — go live your life. Resting now is a way of winning the day, not skipping it.")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft).lineSpacing(4)
                    .frame(maxWidth: 520, alignment: .leading)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .card(accentEdge: Theme.accent.opacity(0.25))

            // What you moved today
            if !store.todaysProgress.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Eyebrow(text: "Moved today")
                    VStack(spacing: 8) {
                        ForEach(store.todaysProgress) { ev in
                            HStack(spacing: 10) {
                                Image(systemName: ev.kind == .advancedStage ? "arrow.forward.circle.fill" : "checkmark.circle.fill")
                                    .foregroundStyle(Theme.accent)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(ev.detail).font(Theme.bodyMed).foregroundStyle(Theme.ink)
                                    Text(ev.questName).font(Theme.caption).foregroundStyle(Theme.inkFaint)
                                }
                                Spacer()
                            }
                            .padding(12).card()
                        }
                    }
                }
            }

            // Deliberate, undangled escape hatch.
            VStack(alignment: .leading, spacing: 10) {
                if revealMore {
                    if store.hasActionableQuests {
                        Button { withAnimation { store.reopenToday() } } label: {
                            Label("Reopen today's focus", systemImage: "arrow.uturn.backward")
                        }
                        .buttonStyle(QuietButtonStyle())
                    } else {
                        Text("Nothing else is queued anyway. Truly — you're done.")
                            .font(Theme.caption).foregroundStyle(Theme.inkFaint)
                    }
                } else {
                    Button { withAnimation { revealMore = true } } label: {
                        Text("I want to keep going")
                            .font(Theme.caption).foregroundStyle(Theme.inkFaint).underline()
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 2)
        }
    }
}
