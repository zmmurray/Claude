import SwiftUI

/// Add or edit a quest's details. Tasks are managed on the quest card itself.
struct QuestEditorSheet: View {
    @EnvironmentObject var store: DataStore
    @Environment(\.dismiss) private var dismiss
    let existing: Quest?

    @State private var name: String
    @State private var firstTask: String
    @State private var importance: Int
    @State private var deadlineType: DeadlineType
    @State private var deadlineDate: Date
    @State private var notes: String
    @State private var showDeleteConfirm = false

    init(existing: Quest?) {
        self.existing = existing
        _name = State(initialValue: existing?.name ?? "")
        _firstTask = State(initialValue: "")
        _importance = State(initialValue: existing?.importance ?? 3)
        _deadlineType = State(initialValue: existing?.deadline.type ?? .none)
        _deadlineDate = State(initialValue: existing?.deadline.date ?? Date().addingTimeInterval(60*60*24*7))
        _notes = State(initialValue: existing?.notes ?? "")
    }

    private var canSave: Bool { !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(existing == nil ? "New Quest" : "Edit Quest").font(Theme.titleM).foregroundStyle(Theme.ink)
                Spacer()
                if existing != nil {
                    Button(role: .destructive) { showDeleteConfirm = true } label: {
                        Image(systemName: "trash").foregroundStyle(Theme.inkSoft)
                    }.buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 22).padding(.vertical, 16)
            Divider().overlay(Color.white.opacity(0.5))

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    field("Quest name") {
                        TextField("e.g. Pelagos — short film", text: $name)
                            .textFieldStyle(.plain).font(Theme.titleM).foregroundStyle(Theme.ink)
                    }
                    if existing == nil {
                        field("First task", hint: "Optional — you can add more on the card.") {
                            TextField("e.g. Render shot 14", text: $firstTask)
                                .textFieldStyle(.plain).font(Theme.body).foregroundStyle(Theme.ink)
                        }
                    }
                    field("How important is it?") { importancePicker }
                    field("Deadline") { deadlinePicker }
                    field("Notes", hint: "Optional.") {
                        TextEditor(text: $notes).font(Theme.body).foregroundStyle(Theme.ink)
                            .scrollContentBackground(.hidden).frame(minHeight: 54)
                    }
                }
                .padding(22)
            }
            .scrollIndicators(.hidden)

            Divider().overlay(Color.white.opacity(0.5))
            HStack(spacing: 12) {
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(QuietButtonStyle())
                Button(existing == nil ? "Add quest" : "Save") { save() }
                    .buttonStyle(PrimaryActionButtonStyle()).disabled(!canSave).opacity(canSave ? 1 : 0.5)
            }
            .padding(.horizontal, 22).padding(.vertical, 16)
        }
        .frame(width: 520, height: 560)
        .background(LinearGradient(colors: [Theme.skyTop, Theme.skyMid], startPoint: .top, endPoint: .bottom))
        .confirmationDialog("Delete this quest?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) { if let existing { store.delete(existing); dismiss() } }
            Button("Cancel", role: .cancel) {}
        }
    }

    @ViewBuilder private func field<Content: View>(_ title: String, hint: String? = nil, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Eyebrow(text: title)
            content().padding(12).frame(maxWidth: .infinity, alignment: .leading).glass()
            if let hint { Text(hint).font(Theme.caption).foregroundStyle(Theme.inkFaint) }
        }
    }

    private var importancePicker: some View {
        HStack(spacing: 8) {
            ForEach(1...5, id: \.self) { i in
                Button { importance = i } label: {
                    Image(systemName: i <= importance ? "leaf.fill" : "leaf").font(.system(size: 18))
                        .foregroundStyle(i <= importance ? Theme.accent : Theme.inkFaint.opacity(0.45))
                }.buttonStyle(.plain)
            }
            Spacer()
            Text(importanceLabel).font(Theme.caption).foregroundStyle(Theme.inkSoft)
        }
    }
    private var importanceLabel: String {
        switch importance { case 5: return "Essential"; case 4: return "High"; case 3: return "Matters"; case 2: return "Minor"; default: return "Someday" }
    }

    private var deadlinePicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) { dChip("No deadline", .none); dChip("Target date", .soft); dChip("Hard deadline", .hard) }
            if deadlineType != .none {
                DatePicker("", selection: $deadlineDate, displayedComponents: .date)
                    .datePickerStyle(.field).labelsHidden().tint(Theme.accent)
            }
        }
    }
    private func dChip(_ label: String, _ t: DeadlineType) -> some View {
        let selected = deadlineType == t
        return Button { deadlineType = t } label: {
            Text(label).font(Theme.caption).foregroundStyle(selected ? .white : Theme.inkSoft)
                .padding(.horizontal, 11).padding(.vertical, 6)
                .background(Capsule().fill(selected ? Theme.accent : Color.white.opacity(0.6)))
        }.buttonStyle(.plain)
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let deadline = Deadline(type: deadlineType, date: deadlineType == .none ? nil : deadlineDate)
        var quest = existing ?? Quest(name: trimmed)
        quest.name = trimmed
        quest.importance = importance
        quest.deadline = deadline
        quest.notes = notes
        if existing == nil {
            let t = firstTask.trimmingCharacters(in: .whitespacesAndNewlines)
            if !t.isEmpty { quest.tasks.append(TaskItem(title: t)) }
        }
        store.upsert(quest)
        dismiss()
    }
}
