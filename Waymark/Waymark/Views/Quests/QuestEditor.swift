import SwiftUI

/// Add or edit a quest. A styled sheet (not a stock Form) to keep the dark, calm look.
struct QuestEditorSheet: View {
    @EnvironmentObject var store: DataStore
    @Environment(\.dismiss) private var dismiss

    /// nil → creating a new quest.
    let existing: Quest?

    @State private var name: String
    @State private var axis: StrategicAxis
    @State private var weight: Int
    @State private var deadlineType: DeadlineType
    @State private var deadlineDate: Date
    @State private var stage: Stage
    @State private var nextAction: String
    @State private var notes: String
    @State private var showDeleteConfirm = false

    init(existing: Quest?) {
        self.existing = existing
        let q = existing
        _name = State(initialValue: q?.name ?? "")
        _axis = State(initialValue: q?.axis ?? .ip)
        _weight = State(initialValue: q?.strategicWeight ?? 3)
        _deadlineType = State(initialValue: q?.deadline.type ?? .none)
        _deadlineDate = State(initialValue: q?.deadline.date ?? Date().addingTimeInterval(60 * 60 * 24 * 7))
        _stage = State(initialValue: q?.stage ?? .idea)
        _nextAction = State(initialValue: q?.nextAction ?? "")
        _notes = State(initialValue: q?.notes ?? "")
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(existing == nil ? "New Quest" : "Edit Quest")
                    .font(Theme.titleM).foregroundStyle(Theme.ink)
                Spacer()
                if existing != nil {
                    Button(role: .destructive) { showDeleteConfirm = true } label: {
                        Image(systemName: "trash").foregroundStyle(Theme.inkSoft)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 18)

            Divider().overlay(Theme.hairline)

            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    field("Quest name") {
                        TextField("e.g. Pelagos — short film", text: $name)
                            .textFieldStyle(.plain)
                            .font(Theme.titleM)
                            .foregroundStyle(Theme.ink)
                    }

                    field("Next concrete step", hint: "The single move you could start now. This is what the app surfaces.") {
                        TextField("e.g. Render shot 14", text: $nextAction)
                            .textFieldStyle(.plain)
                            .font(Theme.body)
                            .foregroundStyle(Theme.ink)
                    }

                    field("Strategic axis", hint: "Which life goal does this serve?") {
                        axisPicker
                    }

                    field("Strategic weight", hint: "How much it matters to your real life — yours to set, 1 to 5.") {
                        weightPicker
                    }

                    field("Stage") {
                        stagePicker
                    }

                    field("Deadline") {
                        deadlinePicker
                    }

                    field("Notes", hint: "Optional.") {
                        TextEditor(text: $notes)
                            .font(Theme.body)
                            .foregroundStyle(Theme.ink)
                            .scrollContentBackground(.hidden)
                            .frame(minHeight: 64)
                    }
                }
                .padding(24)
            }
            .scrollIndicators(.hidden)

            Divider().overlay(Theme.hairline)

            HStack(spacing: 12) {
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(QuietButtonStyle())
                Button(existing == nil ? "Add quest" : "Save") { save() }
                    .buttonStyle(PrimaryActionButtonStyle())
                    .disabled(!canSave)
                    .opacity(canSave ? 1 : 0.5)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 18)
        }
        .frame(width: 540, height: 660)
        .background(Theme.base)
        .confirmationDialog("Delete this quest?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                if let existing { store.delete(existing); dismiss() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Its history stays in your tracks, but the quest is removed.")
        }
    }

    // MARK: Pieces

    @ViewBuilder
    private func field<Content: View>(_ title: String, hint: String? = nil, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: title)
            content()
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .card()
            if let hint {
                Text(hint).font(Theme.caption).foregroundStyle(Theme.inkFaint)
            }
        }
    }

    private var axisPicker: some View {
        HStack(spacing: 8) {
            ForEach(StrategicAxis.allCases) { a in
                let selected = a == axis
                Button { axis = a } label: {
                    HStack(spacing: 6) {
                        Circle().fill(a.color).frame(width: 7, height: 7)
                        Text(a.shortName).font(Theme.caption)
                    }
                    .foregroundStyle(selected ? Theme.ink : Theme.inkSoft)
                    .padding(.horizontal, 10).padding(.vertical, 7)
                    .background(Capsule().fill(selected ? a.color.opacity(0.18) : Theme.surfaceHi.opacity(0.5)))
                    .overlay(Capsule().strokeBorder(selected ? a.color.opacity(0.5) : Theme.hairline, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var weightPicker: some View {
        HStack(spacing: 10) {
            ForEach(1...5, id: \.self) { i in
                Button { weight = i } label: {
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(i <= weight ? Theme.accent.opacity(0.9) : Theme.surfaceHi)
                        .frame(width: 30, height: 22 + CGFloat(i) * 6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .strokeBorder(i <= weight ? Theme.accentDeep : Theme.hairline, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
            Spacer()
            Text(weightLabel).font(Theme.caption).foregroundStyle(Theme.inkSoft)
        }
    }

    private var weightLabel: String {
        switch weight {
        case 5: return "Essential"
        case 4: return "High"
        case 3: return "Meaningful"
        case 2: return "Minor"
        default: return "Background"
        }
    }

    private var stagePicker: some View {
        HStack(spacing: 6) {
            ForEach(Stage.allCases) { s in
                let selected = s == stage
                Button { stage = s } label: {
                    Text(s == .delivered ? "Delivered" : s.title)
                        .font(Theme.caption)
                        .foregroundStyle(selected ? Theme.base : Theme.inkSoft)
                        .padding(.horizontal, 10).padding(.vertical, 7)
                        .background(Capsule().fill(selected ? Theme.accent : Theme.surfaceHi.opacity(0.5)))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var deadlinePicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                ForEach(DeadlineType.allCases) { t in
                    let selected = t == deadlineType
                    Button { deadlineType = t } label: {
                        Text(t.label)
                            .font(Theme.caption)
                            .foregroundStyle(selected ? Theme.base : Theme.inkSoft)
                            .padding(.horizontal, 12).padding(.vertical, 7)
                            .background(Capsule().fill(selected ? Theme.accent : Theme.surfaceHi.opacity(0.5)))
                    }
                    .buttonStyle(.plain)
                }
            }
            if deadlineType != .none {
                DatePicker("", selection: $deadlineDate, displayedComponents: .date)
                    .datePickerStyle(.field)
                    .labelsHidden()
                    .tint(Theme.accent)
            }
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let deadline = Deadline(type: deadlineType, date: deadlineType == .none ? nil : deadlineDate)
        var quest = existing ?? Quest(name: trimmed, axis: axis)
        quest.name = trimmed
        quest.axis = axis
        quest.strategicWeight = weight
        quest.deadline = deadline
        quest.stage = stage
        quest.nextAction = nextAction.trimmingCharacters(in: .whitespacesAndNewlines)
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
            VStack(alignment: .leading, spacing: 6) {
                AxisChip(axis: quest.axis)
                Text(quest.name).font(Theme.titleM).foregroundStyle(Theme.ink)
                Text("What's one small move you could actually start?")
                    .font(Theme.body).foregroundStyle(Theme.inkSoft)
            }
            TextField("e.g. Sketch the opening shot list", text: $text)
                .textFieldStyle(.plain)
                .font(Theme.body)
                .foregroundStyle(Theme.ink)
                .padding(12)
                .card()
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(QuietButtonStyle())
                Button("Set step") {
                    let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !t.isEmpty { store.setNextAction(t, for: quest) }
                    dismiss()
                }
                .buttonStyle(PrimaryActionButtonStyle())
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(24)
        .frame(width: 460)
        .background(Theme.base)
    }
}
