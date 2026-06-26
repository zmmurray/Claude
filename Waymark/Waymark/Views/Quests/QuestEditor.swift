import SwiftUI

/// Add or edit a quest. Short and friendly: name, first step, and which goal it serves
/// are what matter; the rest is optional.
struct QuestEditorSheet: View {
    @EnvironmentObject var store: DataStore
    @Environment(\.dismiss) private var dismiss
    let existing: Quest?

    @State private var name: String
    @State private var nextStep: String
    @State private var goalID: UUID?
    @State private var importance: Int
    @State private var deadlineType: DeadlineType
    @State private var deadlineDate: Date
    @State private var stage: Stage
    @State private var notes: String
    @State private var showMore: Bool
    @State private var showDeleteConfirm = false

    init(existing: Quest?) {
        self.existing = existing
        let q = existing
        _name = State(initialValue: q?.name ?? "")
        _nextStep = State(initialValue: q?.nextStep ?? "")
        _goalID = State(initialValue: q?.goalID)
        _importance = State(initialValue: q?.importance ?? 3)
        _deadlineType = State(initialValue: q?.deadline.type ?? .none)
        _deadlineDate = State(initialValue: q?.deadline.date ?? Date().addingTimeInterval(60*60*24*7))
        _stage = State(initialValue: q?.stage ?? .idea)
        _notes = State(initialValue: q?.notes ?? "")
        _showMore = State(initialValue: q != nil)
    }

    private var canSave: Bool { !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(existing == nil ? "New Project" : "Edit Project").font(Theme.titleM).foregroundStyle(Theme.ink)
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
                    field("Project name") {
                        TextField("e.g. Short film — Pelagos", text: $name)
                            .textFieldStyle(.plain).font(Theme.titleM).foregroundStyle(Theme.ink)
                    }
                    field("First step", hint: "The one move you could start now. This is what Waymark shows you.") {
                        TextField("e.g. Render shot 14", text: $nextStep)
                            .textFieldStyle(.plain).font(Theme.body).foregroundStyle(Theme.ink)
                    }
                    if !store.goals.isEmpty {
                        VStack(alignment: .leading, spacing: 7) {
                            Eyebrow(text: "Which goal does it serve?")
                            goalPicker
                        }
                    }
                    field("How important is it?") { importancePicker }

                    if showMore {
                        field("Deadline") { deadlinePicker }
                        field("Stage", hint: "Where this project is along its journey.") { stagePicker }
                        field("Notes", hint: "Optional.") {
                            TextEditor(text: $notes).font(Theme.body).foregroundStyle(Theme.ink)
                                .scrollContentBackground(.hidden).frame(minHeight: 54)
                        }
                    } else {
                        Button { withAnimation { showMore = true } } label: {
                            Label("Add deadline, stage, notes", systemImage: "plus.circle")
                                .font(Theme.bodyMed).foregroundStyle(Theme.accent)
                        }.buttonStyle(.plain)
                    }
                }
                .padding(22)
            }
            .scrollIndicators(.hidden)

            Divider().overlay(Color.white.opacity(0.5))
            HStack(spacing: 12) {
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(QuietButtonStyle())
                Button(existing == nil ? "Add project" : "Save") { save() }
                    .buttonStyle(PrimaryActionButtonStyle()).disabled(!canSave).opacity(canSave ? 1 : 0.5)
            }
            .padding(.horizontal, 22).padding(.vertical, 16)
        }
        .frame(width: 540, height: 640)
        .background(LinearGradient(colors: [Theme.skyTop, Theme.skyMid], startPoint: .top, endPoint: .bottom))
        .confirmationDialog("Delete this project?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
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

    private var goalPicker: some View {
        WrapLayout(spacing: 8) {
            chip("None", color: Theme.inkFaint, selected: goalID == nil) { goalID = nil }
            ForEach(store.goals) { g in
                chip(g.name, color: g.color, selected: goalID == g.id) { goalID = g.id }
            }
        }
    }

    private func chip(_ label: String, color: Color, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Circle().fill(color).frame(width: 7, height: 7)
                Text(label).font(Theme.caption).foregroundStyle(selected ? .white : Theme.inkSoft)
            }
            .padding(.horizontal, 11).padding(.vertical, 7)
            .background(Capsule().fill(selected ? color : Color.white.opacity(0.5)))
            .overlay(Capsule().strokeBorder(selected ? .clear : color.opacity(0.35), lineWidth: 1))
        }.buttonStyle(.plain)
    }

    private var importancePicker: some View {
        HStack(spacing: 8) {
            ForEach(1...5, id: \.self) { i in
                Button { importance = i } label: {
                    Image(systemName: i <= importance ? "leaf.fill" : "leaf")
                        .font(.system(size: 18))
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

    private var stagePicker: some View {
        WrapLayout(spacing: 6) {
            ForEach(Stage.allCases) { s in
                let selected = s == stage
                Button { stage = s } label: {
                    Text(s.title).font(Theme.caption).foregroundStyle(selected ? .white : Theme.inkSoft)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(Capsule().fill(selected ? Theme.accent : Color.white.opacity(0.5)))
                }.buttonStyle(.plain)
            }
        }
    }

    private var deadlinePicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                dChip("No deadline", .none); dChip("Target date", .soft); dChip("Hard deadline", .hard)
            }
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
                .background(Capsule().fill(selected ? Theme.accent : Color.white.opacity(0.5)))
        }.buttonStyle(.plain)
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let deadline = Deadline(type: deadlineType, date: deadlineType == .none ? nil : deadlineDate)
        var quest = existing ?? Quest(name: trimmed)
        quest.name = trimmed
        quest.goalID = goalID
        quest.importance = importance
        quest.deadline = deadline
        quest.stage = stage
        quest.nextStep = nextStep.trimmingCharacters(in: .whitespacesAndNewlines)
        quest.notes = notes
        store.upsert(quest)
        dismiss()
    }
}

/// A focused little sheet just for naming a missing next step.
struct NextStepSheet: View {
    @EnvironmentObject var store: DataStore
    @Environment(\.dismiss) private var dismiss
    let quest: Quest
    @State private var text: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text(quest.name).font(Theme.titleM).foregroundStyle(Theme.ink)
            Text("What's one small move you could actually start?")
                .font(Theme.body).foregroundStyle(Theme.inkSoft)
            TextField("e.g. Sketch the opening shot list", text: $text)
                .textFieldStyle(.plain).font(Theme.body).foregroundStyle(Theme.ink)
                .padding(12).glass()
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(QuietButtonStyle())
                Button("Set step") {
                    let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !t.isEmpty { store.setNextStep(t, for: quest) }
                    dismiss()
                }.buttonStyle(PrimaryActionButtonStyle())
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(22).frame(width: 440)
        .background(LinearGradient(colors: [Theme.skyTop, Theme.skyMid], startPoint: .top, endPoint: .bottom))
    }
}
