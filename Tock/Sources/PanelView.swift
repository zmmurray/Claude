import SwiftUI
import AppKit

/// Dark palette for the panel.
enum TockTheme {
    /// Panel backdrop (near-black).
    static let panel = Color(red: 0.09, green: 0.09, blue: 0.11)
    /// Slightly elevated surface for the rounded cards.
    static let card = Color(red: 0.16, green: 0.16, blue: 0.18)
}

/// The window that drops down from the menu bar icon.
struct PanelView: View {
    @EnvironmentObject var store: TimerStore

    @State private var addingProject = false
    @State private var newProjectName = ""
    @State private var listMode: ListMode = .sessions
    @FocusState private var newProjectFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            projectSelector

            VStack(spacing: 12) {
                timerSection
                statsRow
            }
            .padding(14)
            .frame(maxWidth: .infinity)
            .background(TockTheme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            listSection
                .padding(12)
                .background(TockTheme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            Button {
                MainWindowController.shared.show()
            } label: {
                Label("Open Window", systemImage: "macwindow")
                    .frame(maxWidth: .infinity)
            }
            .controlSize(.large)
            .buttonStyle(.bordered)
            .help("Open a larger, resizable window to browse projects and sessions")

            footer
                .padding(.top, 2)
        }
        .padding(14)
        .frame(width: 320)
        .background(TockTheme.panel)
        .preferredColorScheme(.dark)
    }

    // MARK: Project selector

    private var projectSelector: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Picker("Project", selection: $store.selectedProjectId) {
                    if store.projects.isEmpty {
                        Text("No projects yet").tag(UUID?.none)
                    }
                    ForEach(store.projects) { project in
                        Text(project.name).tag(UUID?.some(project.id))
                    }
                }
                .labelsHidden()
                .disabled(store.isRunning || store.projects.isEmpty)

                Button {
                    addingProject.toggle()
                    if addingProject { newProjectFocused = true }
                } label: {
                    Image(systemName: "plus")
                }
                .buttonStyle(.bordered)
                .help("New project")
                .disabled(store.isRunning)
            }

            if addingProject {
                HStack(spacing: 8) {
                    TextField("New project name", text: $newProjectName)
                        .textFieldStyle(.roundedBorder)
                        .focused($newProjectFocused)
                        .onSubmit(commitNewProject)
                    Button("Add", action: commitNewProject)
                        .disabled(newProjectName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func commitNewProject() {
        if store.addProject(named: newProjectName) != nil {
            newProjectName = ""
            addingProject = false
        }
    }

    // MARK: Timer

    private var timerSection: some View {
        VStack(spacing: 10) {
            if store.isRunning {
                Text(Format.liveClock(store.liveElapsed))
                    .font(.system(size: 34, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                if let p = store.project(store.running?.projectId) {
                    Text(p.name)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("Not tracking")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(.secondary)
                    .frame(height: 41)
            }

            Button(action: store.toggle) {
                Text(store.isRunning ? "Stop" : "Start")
                    .frame(maxWidth: .infinity)
                    .font(.headline)
            }
            .controlSize(.large)
            .buttonStyle(.borderedProminent)
            .tint(store.isRunning ? .red : .accentColor)
            .disabled(!store.isRunning && store.selectedProjectId == nil)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: Stats

    private var statsRow: some View {
        HStack {
            stat(title: "Today", value: Format.humanTotal(store.todayTotal))
            Spacer()
            stat(title: projectTotalTitle,
                 value: Format.humanTotal(selectedProjectTotal),
                 alignment: .trailing)
        }
    }

    private var projectTotalTitle: String {
        if let p = store.project(store.selectedProjectId) { return p.name }
        return "Project"
    }

    private var selectedProjectTotal: TimeInterval {
        guard let id = store.selectedProjectId else { return 0 }
        return store.total(for: id)
    }

    private func stat(title: String, value: String,
                      alignment: HorizontalAlignment = .leading) -> some View {
        VStack(alignment: alignment, spacing: 2) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Text(value)
                .font(.system(.title3, design: .rounded))
                .fontWeight(.semibold)
        }
    }

    // MARK: Sessions / project totals

    private enum ListMode: String, CaseIterable, Identifiable {
        case sessions = "Sessions"
        case projects = "Projects"
        var id: String { rawValue }
    }

    private var listSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Picker("View", selection: $listMode) {
                ForEach(ListMode.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .labelsHidden()

            switch listMode {
            case .sessions: sessionsContent
            case .projects: projectsContent
            }
        }
    }

    @ViewBuilder
    private var sessionsContent: some View {
        if store.recentSessions.isEmpty {
            emptyListText("No sessions yet")
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(store.recentSessions) { session in
                        SessionRow(session: session)
                        if session.id != store.recentSessions.last?.id {
                            Divider()
                        }
                    }
                }
            }
            .frame(maxHeight: 200)
        }
    }

    /// Every project with its all-time total, biggest first (live-updating).
    private var projectTotals: [(project: Project, total: TimeInterval)] {
        store.projects
            .map { ($0, store.total(for: $0.id)) }
            .sorted { $0.total > $1.total }
    }

    @ViewBuilder
    private var projectsContent: some View {
        if store.projects.isEmpty {
            emptyListText("No projects yet")
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    let rows = projectTotals
                    ForEach(rows, id: \.project.id) { item in
                        Button {
                            store.selectedProjectId = item.project.id
                        } label: {
                            HStack {
                                Text(item.project.name)
                                    .lineLimit(1)
                                    .fontWeight(item.project.id == store.selectedProjectId ? .semibold : .regular)
                                Spacer()
                                Text(Format.humanTotal(item.total))
                                    .monospacedDigit()
                                    .foregroundStyle(.secondary)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .padding(.vertical, 7)
                        if item.project.id != rows.last?.project.id {
                            Divider()
                        }
                    }
                }
            }
            .frame(maxHeight: 200)
        }
    }

    private func emptyListText(_ text: String) -> some View {
        Text(text)
            .font(.callout)
            .foregroundStyle(.tertiary)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.vertical, 12)
    }

    // MARK: Footer

    private var footer: some View {
        HStack {
            Button {
                store.exportCSV()
            } label: {
                Label("Export CSV", systemImage: "square.and.arrow.up")
            }
            .disabled(store.sessions.isEmpty)

            Spacer()

            Menu {
                LaunchAtLoginToggle()
                Divider()
                Toggle("Auto-stop when idle", isOn: $store.autoStopWhenIdle)
                Picker("Idle timeout", selection: $store.idleThresholdMinutes) {
                    Text("After 5 min").tag(5)
                    Text("After 10 min").tag(10)
                    Text("After 15 min").tag(15)
                }
                .disabled(!store.autoStopWhenIdle)
                if let id = store.selectedProjectId,
                   let p = store.project(id) {
                    Divider()
                    Button("Delete project \u{201C}\(p.name)\u{201D}", role: .destructive) {
                        store.deleteProject(id)
                    }
                    .disabled(store.isRunning)
                }
                Divider()
                Button("Quit Tock") { NSApp.terminate(nil) }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
            .menuStyle(.borderlessButton)
            .frame(width: 28)
        }
    }
}

/// One row in a sessions list, with hover-revealed edit/delete buttons.
/// `showsProject` hides the project name when the list is already one project.
struct SessionRow: View {
    @EnvironmentObject var store: TimerStore
    let session: Session
    var showsProject: Bool = true
    @State private var hovering = false
    @State private var isEditing = false

    var body: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                if showsProject {
                    Text(store.project(session.projectId)?.name ?? "Unknown")
                        .font(.callout)
                        .lineLimit(1)
                    Text(Format.listDate.string(from: session.startDate))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text(Format.listDate.string(from: session.startDate))
                        .font(.callout)
                }
            }
            Spacer()
            Text(Format.liveClock(session.duration))
                .font(.callout.monospacedDigit())
                .foregroundStyle(.secondary)
            Button {
                isEditing = true
            } label: {
                Image(systemName: "pencil")
            }
            .buttonStyle(.borderless)
            .opacity(hovering ? 1 : 0)
            .help("Edit session")
            Button {
                store.deleteSession(session.id)
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.borderless)
            .foregroundStyle(.red)
            .opacity(hovering ? 1 : 0)
            .help("Delete session")
        }
        .padding(.vertical, 6)
        .contentShape(Rectangle())
        .onHover { hovering = $0 }
        .onTapGesture { isEditing = true }
        .popover(isPresented: $isEditing, arrowEdge: .leading) {
            SessionEditor(session: session) { isEditing = false }
                .environmentObject(store)
        }
    }
}

/// Popover editor for fixing a session after the fact: change project, adjust
/// start/end, or quickly trim minutes off the end (forgot-to-stop case).
struct SessionEditor: View {
    @EnvironmentObject var store: TimerStore
    let session: Session
    let onClose: () -> Void

    @State private var projectId: UUID
    @State private var start: Date
    @State private var end: Date

    init(session: Session, onClose: @escaping () -> Void) {
        self.session = session
        self.onClose = onClose
        _projectId = State(initialValue: session.projectId)
        _start = State(initialValue: session.startDate)
        _end = State(initialValue: session.endDate)
    }

    private var isValid: Bool { end > start }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Edit session")
                .font(.headline)

            Picker("Project", selection: $projectId) {
                ForEach(store.projects) { project in
                    Text(project.name).tag(project.id)
                }
            }
            .labelsHidden()

            DatePicker("Start", selection: $start,
                       displayedComponents: [.date, .hourAndMinute])
            DatePicker("End", selection: $end, in: start...,
                       displayedComponents: [.date, .hourAndMinute])

            HStack(spacing: 6) {
                Text("Trim end")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                ForEach([5, 15, 30], id: \.self) { mins in
                    Button("−\(mins)m") {
                        end = max(start, end.addingTimeInterval(Double(-mins * 60)))
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }

            HStack {
                Text("Duration")
                    .foregroundStyle(.secondary)
                Spacer()
                Text(Format.liveClock(max(0, end.timeIntervalSince(start))))
                    .monospacedDigit()
                    .foregroundStyle(isValid ? Color.primary : Color.red)
            }
            .font(.callout)

            Divider()

            HStack {
                Button("Cancel", action: onClose)
                Spacer()
                Button("Save") {
                    store.updateSession(id: session.id, projectId: projectId,
                                        startDate: start, endDate: end)
                    onClose()
                }
                .keyboardShortcut(.defaultAction)
                .disabled(!isValid)
            }
        }
        .padding(16)
        .frame(width: 290)
    }
}

/// Launch-at-login toggle backed by SMAppService.mainApp.
private struct LaunchAtLoginToggle: View {
    @EnvironmentObject var store: TimerStore
    @State private var enabled = TimerStore.shared.launchAtLoginEnabled

    var body: some View {
        Toggle("Launch at login", isOn: $enabled)
            .onChange(of: enabled) { _, newValue in
                store.setLaunchAtLogin(newValue)
                // Re-read in case the system rejected the change.
                enabled = store.launchAtLoginEnabled
            }
    }
}
