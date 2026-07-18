import SwiftUI
import AppKit

/// Opens and owns the resizable main window (AppKit-hosted so it never appears
/// on launch — only when the user asks for it).
final class MainWindowController {
    static let shared = MainWindowController()
    private var window: NSWindow?

    func show() {
        if window == nil {
            let hosting = NSHostingController(
                rootView: MainWindowView().environmentObject(TimerStore.shared))
            let w = NSWindow(contentViewController: hosting)
            w.title = "Tock"
            w.styleMask = [.titled, .closable, .miniaturizable, .resizable]
            w.setContentSize(NSSize(width: 820, height: 560))
            w.contentMinSize = NSSize(width: 620, height: 400)
            w.isReleasedWhenClosed = false
            w.center()
            window = w
        }
        NSApp.activate(ignoringOtherApps: true)
        window?.makeKeyAndOrderFront(nil)
    }
}

private enum SidebarItem: Hashable {
    case all
    case project(UUID)
}

/// Sidebar of projects + a detail pane showing that project's sessions.
struct MainWindowView: View {
    @EnvironmentObject var store: TimerStore
    @State private var selection: SidebarItem? = .all

    var body: some View {
        NavigationSplitView {
            sidebar
                .navigationSplitViewColumnWidth(min: 220, ideal: 250, max: 340)
        } detail: {
            detail
        }
        .frame(minWidth: 620, minHeight: 400)
        .preferredColorScheme(.dark)
    }

    // MARK: Sidebar

    private var projectsByTotal: [(project: Project, total: TimeInterval)] {
        store.projects
            .map { ($0, store.total(for: $0.id)) }
            .sorted { $0.total > $1.total }
    }

    private var sidebar: some View {
        List(selection: $selection) {
            Section {
                Label("All Sessions", systemImage: "tray.full")
                    .tag(SidebarItem.all)
            }
            Section("Projects") {
                ForEach(projectsByTotal, id: \.project.id) { row in
                    HStack {
                        Text(row.project.name)
                            .lineLimit(1)
                        Spacer()
                        Text(Format.humanTotal(row.total))
                            .font(.caption)
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                    }
                    .tag(SidebarItem.project(row.project.id))
                }
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Tock")
    }

    // MARK: Detail

    @ViewBuilder
    private var detail: some View {
        switch selection {
        case .all, .none:
            SessionsDetail(title: "All Sessions",
                           subtitle: Format.humanTotal(allTimeTotal) + " total · \(store.sessions.count) sessions",
                           sessions: store.recentSessions,
                           showsProject: true,
                           project: nil)
        case .project(let id):
            if let project = store.project(id) {
                ProjectDetail(project: project)
            } else {
                ContentUnavailableFallback(text: "Select a project")
            }
        }
    }

    private var allTimeTotal: TimeInterval {
        store.projects.reduce(0) { $0 + store.total(for: $1.id) }
    }
}

/// Header + Start/Stop + this project's sessions.
private struct ProjectDetail: View {
    @EnvironmentObject var store: TimerStore
    let project: Project

    private var sessions: [Session] {
        store.sessions
            .filter { $0.projectId == project.id }
            .sorted { $0.startDate > $1.startDate }
    }

    private var isRunningThis: Bool {
        store.running?.projectId == project.id
    }

    var body: some View {
        SessionsDetail(
            title: project.name,
            subtitle: Format.humanTotal(store.total(for: project.id)) + " total · \(sessions.count) sessions",
            sessions: sessions,
            showsProject: false,
            project: project,
            toolbar: {
                Button {
                    if isRunningThis {
                        store.stop()
                    } else {
                        store.start(projectId: project.id)
                    }
                } label: {
                    Label(isRunningThis ? "Stop" : "Start",
                          systemImage: isRunningThis ? "stop.fill" : "play.fill")
                }
                .tint(isRunningThis ? .red : .accentColor)
            }
        )
    }
}

/// Reusable detail pane: a titled header, an optional toolbar, and a session list.
private struct SessionsDetail<Toolbar: View>: View {
    @EnvironmentObject var store: TimerStore
    let title: String
    let subtitle: String
    let sessions: [Session]
    let showsProject: Bool
    let project: Project?
    @ViewBuilder var toolbar: () -> Toolbar

    init(title: String, subtitle: String, sessions: [Session],
         showsProject: Bool, project: Project?,
         @ViewBuilder toolbar: @escaping () -> Toolbar = { EmptyView() }) {
        self.title = title
        self.subtitle = subtitle
        self.sessions = sessions
        self.showsProject = showsProject
        self.project = project
        self.toolbar = toolbar
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.title2.weight(.semibold))
                        .lineLimit(1)
                    Text(subtitle)
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                toolbar()
                Button {
                    store.exportCSV()
                } label: {
                    Label("Export CSV", systemImage: "square.and.arrow.up")
                }
                .disabled(store.sessions.isEmpty)
                if let project {
                    Button(role: .destructive) {
                        store.deleteProject(project.id)
                    } label: {
                        Image(systemName: "trash")
                    }
                    .help("Delete this project and its sessions")
                }
            }
            .padding(20)

            Divider()

            if sessions.isEmpty {
                Spacer()
                Text("No sessions yet")
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity)
                Spacer()
            } else {
                List {
                    ForEach(sessions) { session in
                        SessionRow(session: session, showsProject: showsProject)
                    }
                }
                .listStyle(.inset)
            }
        }
    }
}

private struct ContentUnavailableFallback: View {
    let text: String
    var body: some View {
        Text(text)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
