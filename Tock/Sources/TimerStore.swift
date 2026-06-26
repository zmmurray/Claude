import Foundation
import AppKit
import ServiceManagement
import UniformTypeIdentifiers

/// Single source of truth for projects, sessions and the running timer.
/// Owns persistence (Codable JSON, atomic writes) and the 1-second tick that
/// drives the live UI. Elapsed time is always computed as `now - startDate`
/// so it stays correct across sleep/wake — we never accumulate a counter.
final class TimerStore: ObservableObject {

    static let shared = TimerStore()

    @Published private(set) var projects: [Project] = []
    @Published private(set) var sessions: [Session] = []
    @Published private(set) var running: RunningSession? = nil

    /// The project chosen in the panel for the next Start.
    @Published var selectedProjectId: UUID? = nil

    /// Bumped every second to re-render anything showing elapsed time.
    @Published var now: Date = Date()

    private var tickTimer: Timer?
    private var isLoading = false

    var isRunning: Bool { running != nil }

    // MARK: - Lifecycle

    private init() {
        load()
        startTick()
    }

    private func startTick() {
        let timer = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.now = Date()
        }
        // .common so it keeps firing while the menu bar window is open.
        RunLoop.main.add(timer, forMode: .common)
        tickTimer = timer
    }

    // MARK: - Derived values

    var liveElapsed: TimeInterval {
        guard let running else { return 0 }
        return now.timeIntervalSince(running.startDate)
    }

    func project(_ id: UUID?) -> Project? {
        guard let id else { return nil }
        return projects.first { $0.id == id }
    }

    /// Total tracked today (by session start date), including the live session.
    var todayTotal: TimeInterval {
        let cal = Calendar.current
        var sum = sessions
            .filter { cal.isDateInToday($0.startDate) }
            .reduce(0) { $0 + $1.duration }
        if let running, cal.isDateInToday(running.startDate) {
            sum += now.timeIntervalSince(running.startDate)
        }
        return sum
    }

    /// All-time total for a project, including the live session if it matches.
    func total(for projectId: UUID) -> TimeInterval {
        var sum = sessions
            .filter { $0.projectId == projectId }
            .reduce(0) { $0 + $1.duration }
        if let running, running.projectId == projectId {
            sum += now.timeIntervalSince(running.startDate)
        }
        return sum
    }

    /// Most-recent-first, for the panel list.
    var recentSessions: [Session] {
        sessions.sorted { $0.startDate > $1.startDate }
    }

    // MARK: - Projects

    @discardableResult
    func addProject(named rawName: String) -> Project? {
        let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return nil }
        let project = Project(name: name)
        projects.append(project)
        selectedProjectId = project.id
        save()
        return project
    }

    /// Deletes a project, its sessions, and stops the timer if it was running
    /// that project (the in-progress time is discarded).
    func deleteProject(_ id: UUID) {
        if running?.projectId == id {
            running = nil
        }
        sessions.removeAll { $0.projectId == id }
        projects.removeAll { $0.id == id }
        if selectedProjectId == id {
            selectedProjectId = projects.first?.id
        }
        save()
    }

    // MARK: - Timer control

    func start() {
        guard running == nil, let projectId = selectedProjectId,
              projects.contains(where: { $0.id == projectId }) else { return }
        running = RunningSession(projectId: projectId, startDate: Date())
        save()
    }

    func stop() {
        guard let running else { return }
        let session = Session(projectId: running.projectId,
                              startDate: running.startDate,
                              endDate: Date())
        sessions.append(session)
        self.running = nil
        save()
    }

    func toggle() {
        if isRunning { stop() } else { start() }
    }

    func deleteSession(_ id: UUID) {
        sessions.removeAll { $0.id == id }
        save()
    }

    /// Called from `applicationWillTerminate`: finalize the live session so the
    /// real duration is preserved on a graceful quit.
    func finalizeRunningSessionForTermination() {
        guard let running else { return }
        let session = Session(projectId: running.projectId,
                              startDate: running.startDate,
                              endDate: Date())
        sessions.append(session)
        self.running = nil
        save()
    }

    // MARK: - Persistence

    private static var supportDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory,
                                            in: .userDomainMask)[0]
        return base.appendingPathComponent("Tock", isDirectory: true)
    }

    private static var dataURL: URL {
        supportDirectory.appendingPathComponent("data.json")
    }

    private func load() {
        isLoading = true
        defer { isLoading = false }

        let url = Self.dataURL
        guard let data = try? Data(contentsOf: url) else {
            // First launch — nothing to restore.
            return
        }
        guard let decoded = try? JSONDecoder.tock.decode(AppData.self, from: data) else {
            return
        }
        projects = decoded.projects
        sessions = decoded.sessions
        // A `running` value here means the previous process did not finalize it
        // (i.e. it crashed). Deliberately discard rather than resume a stale
        // timer — better than logging idle/overnight hours.
        running = nil
        selectedProjectId = projects.first?.id

        // If we dropped an orphaned running session, rewrite the clean file.
        if decoded.running != nil {
            save()
        }
    }

    private func save() {
        guard !isLoading else { return }
        let payload = AppData(projects: projects, sessions: sessions, running: running)
        do {
            try FileManager.default.createDirectory(at: Self.supportDirectory,
                                                    withIntermediateDirectories: true)
            let data = try JSONEncoder.tock.encode(payload)
            try data.write(to: Self.dataURL, options: .atomic)
        } catch {
            NSLog("Tock: failed to save data: \(error)")
        }
    }

    // MARK: - CSV export

    private func csvString() -> String {
        var rows = ["Project,Start,End,Duration (H:MM:SS),Duration (decimal hours)"]
        let ordered = sessions.sorted { $0.startDate < $1.startDate }
        for s in ordered {
            let name = project(s.projectId)?.name ?? "Unknown"
            let fields = [
                name,
                Format.csvDate.string(from: s.startDate),
                Format.csvDate.string(from: s.endDate),
                Format.liveClock(s.duration),
                Format.decimalHours(s.duration)
            ].map(Self.escapeCSV)
            rows.append(fields.joined(separator: ","))
        }
        return rows.joined(separator: "\n") + "\n"
    }

    private static func escapeCSV(_ field: String) -> String {
        if field.contains(",") || field.contains("\"") || field.contains("\n") {
            return "\"" + field.replacingOccurrences(of: "\"", with: "\"\"") + "\""
        }
        return field
    }

    /// Show a save panel, write the CSV, and reveal it in Finder.
    func exportCSV() {
        NSApp.activate(ignoringOtherApps: true)

        let panel = NSSavePanel()
        panel.title = "Export Sessions"
        panel.nameFieldStringValue = "Tock Export \(Format.fileStampDate.string(from: Date())).csv"
        panel.allowedContentTypes = [.commaSeparatedText]
        panel.canCreateDirectories = true
        panel.isExtensionHidden = false

        guard panel.runModal() == .OK, let url = panel.url else { return }
        do {
            try csvString().data(using: .utf8)?.write(to: url, options: .atomic)
            NSWorkspace.shared.activateFileViewerSelecting([url])
        } catch {
            NSSound.beep()
            NSLog("Tock: CSV export failed: \(error)")
        }
    }

    // MARK: - Launch at login

    var launchAtLoginEnabled: Bool {
        SMAppService.mainApp.status == .enabled
    }

    func setLaunchAtLogin(_ enabled: Bool) {
        do {
            if enabled {
                try SMAppService.mainApp.register()
            } else {
                try SMAppService.mainApp.unregister()
            }
        } catch {
            NSSound.beep()
            NSLog("Tock: launch-at-login change failed: \(error)")
        }
        objectWillChange.send()
    }
}

private extension JSONEncoder {
    static var tock: JSONEncoder {
        let e = JSONEncoder()
        e.outputFormatting = [.prettyPrinted, .sortedKeys]
        e.dateEncodingStrategy = .iso8601
        return e
    }
}

private extension JSONDecoder {
    static var tock: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }
}
