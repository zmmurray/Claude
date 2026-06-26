import SwiftUI
import AppKit

/// Option A — the paste bridge. Copy a prompt into your own ChatGPT/Claude (which
/// already knows your world), paste its JSON reply back, and Waymark builds your
/// goals and quests. No API key, no network.
struct AISetupView: View {
    @EnvironmentObject var store: DataStore
    @Environment(\.dismiss) private var dismiss
    var onImported: () -> Void = {}

    @State private var pasted = ""
    @State private var copied = false
    @State private var error: String?
    @State private var success: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Image(systemName: "sparkles").foregroundStyle(Theme.accent)
                Text("Set up with your AI assistant").font(Theme.titleM).foregroundStyle(Theme.ink)
                Spacer()
            }
            .padding(.horizontal, 22).padding(.vertical, 16)
            Divider().overlay(Color.white.opacity(0.5))

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Your assistant already knows your projects and goals. Let it do the typing.")
                        .font(Theme.body).foregroundStyle(Theme.inkSoft)

                    step(1, "Copy the setup prompt") {
                        Button {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(AIImport.prompt, forType: .string)
                            withAnimation { copied = true }
                        } label: {
                            Label(copied ? "Copied — now paste it into ChatGPT or Claude" : "Copy the prompt",
                                  systemImage: copied ? "checkmark" : "doc.on.doc")
                        }
                        .buttonStyle(PrimaryActionButtonStyle())
                    }

                    step(2, "Paste your assistant's reply here") {
                        TextEditor(text: $pasted)
                            .font(.system(size: 12, design: .monospaced)).foregroundStyle(Theme.ink)
                            .scrollContentBackground(.hidden)
                            .frame(height: 180)
                            .padding(8)
                            .background(RoundedRectangle(cornerRadius: Theme.cornerS).fill(Color.white.opacity(0.85)))
                            .overlay(RoundedRectangle(cornerRadius: Theme.cornerS).strokeBorder(Theme.inkFaint.opacity(0.3), lineWidth: 1))
                    }

                    if let error {
                        Label(error, systemImage: "exclamationmark.triangle")
                            .font(Theme.caption).foregroundStyle(Theme.urgent)
                    }
                    if let success {
                        Label(success, systemImage: "checkmark.circle.fill")
                            .font(Theme.caption).foregroundStyle(Theme.accent)
                    }
                }
                .padding(22)
            }
            .scrollIndicators(.hidden)

            Divider().overlay(Color.white.opacity(0.5))
            HStack(spacing: 12) {
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(QuietButtonStyle())
                Button("Import") { runImport() }
                    .buttonStyle(PrimaryActionButtonStyle())
                    .disabled(pasted.trimmingCharacters(in: .whitespaces).isEmpty)
                    .opacity(pasted.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1)
            }
            .padding(.horizontal, 22).padding(.vertical, 16)
        }
        .frame(width: 560, height: 600)
        .background(LinearGradient(colors: [Theme.skyTop, Theme.skyMid], startPoint: .top, endPoint: .bottom))
    }

    private func step<Content: View>(_ n: Int, _ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 8) {
                Text("\(n)").font(Theme.eyebrow).foregroundStyle(.white)
                    .frame(width: 18, height: 18).background(Circle().fill(Theme.accent))
                Text(title).font(Theme.bodyMed).foregroundStyle(Theme.ink)
            }
            content()
        }
    }

    private func runImport() {
        error = nil; success = nil
        do {
            let r = try store.importFromAI(pasted)
            success = "Added \(r.quests) quest\(r.quests == 1 ? "" : "s") and \(r.tasks) task\(r.tasks == 1 ? "" : "s")."
            onImported()
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 650_000_000)
                dismiss()
            }
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Something went wrong importing that."
        }
    }
}
