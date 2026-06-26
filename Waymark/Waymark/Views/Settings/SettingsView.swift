import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var store: DataStore
    @Environment(\.dismiss) private var dismiss
    @State private var showAI = false
    @State private var showResetConfirm = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Settings").font(Theme.titleM).foregroundStyle(Theme.ink)
                Spacer()
                Button { dismiss() } label: { Image(systemName: "xmark") }
                    .buttonStyle(.plain).foregroundStyle(Theme.inkSoft)
            }
            .padding(.horizontal, 22).padding(.vertical, 16)
            Divider().overlay(Color.white.opacity(0.5))

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    section("Set up with AI", "Let your AI assistant fill in your quests and tasks.") {
                        Button { showAI = true } label: { Label("Open AI setup", systemImage: "sparkles") }
                            .buttonStyle(PrimaryActionButtonStyle())
                    }

                    section("Background", "Use one of your own photos as the backdrop.") {
                        HStack(spacing: 12) {
                            Button { if let url = pickBackgroundImage() { store.setBackgroundImage(from: url) } } label: {
                                Label("Choose photo…", systemImage: "photo")
                            }.buttonStyle(QuietButtonStyle())
                            if store.hasCustomBackground {
                                Button { store.clearBackgroundImage() } label: {
                                    Label("Use built-in", systemImage: "sparkles")
                                }.buttonStyle(QuietButtonStyle())
                            }
                        }
                    }

                    section("Intro", "See the welcome walkthrough again.") {
                        Button { store.restartOnboarding(); dismiss() } label: {
                            Label("Replay intro", systemImage: "play.circle")
                        }.buttonStyle(QuietButtonStyle())
                    }

                    section("Start over", "Clear all quests, tasks, and history (your background is kept).") {
                        Button(role: .destructive) { showResetConfirm = true } label: {
                            Label("Clear everything", systemImage: "trash")
                        }.buttonStyle(QuietButtonStyle())
                    }
                }
                .padding(22)
            }
            .scrollIndicators(.hidden)
        }
        .frame(width: 520, height: 560)
        .background(LinearGradient(colors: [Theme.skyTop, Theme.skyMid], startPoint: .top, endPoint: .bottom))
        .sheet(isPresented: $showAI) { AISetupView().environmentObject(store) }
        .confirmationDialog("Clear everything and start over?", isPresented: $showResetConfirm, titleVisibility: .visible) {
            Button("Clear everything", role: .destructive) { store.resetAll(); dismiss() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes all quests, tasks, and progress on this Mac.")
        }
    }

    private func section<Content: View>(_ title: String, _ subtitle: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(title).font(Theme.bodyMed).foregroundStyle(Theme.ink)
            Text(subtitle).font(Theme.caption).foregroundStyle(Theme.inkSoft)
            content()
        }
        .padding(18).frame(maxWidth: .infinity, alignment: .leading).glass()
    }
}
