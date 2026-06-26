# Tock

A tiny native macOS menu bar app for tracking time on projects. Swift + SwiftUI,
`MenuBarExtra` (window style), no dock icon, no network, no dependencies. Data
lives in plain JSON on your Mac.

> **Heads-up:** this project was authored on a Linux CI container, which has no
> Swift toolchain, so it was **not** compiled there. The code is written to
> build cleanly on macOS 14+. Follow the steps below; if the compiler flags
> anything, it'll be a quick fix.

## Requirements

- macOS 14 (Sonoma) or newer
- Xcode 15+ (for the Swift 5.9 / macOS 14 SDK)
- [XcodeGen](https://github.com/yonsm/XcodeGen) — `brew install xcodegen`
  (the build script installs it for you if missing)

## Build

From the `Tock/` directory:

```bash
./build.sh
```

That generates the Xcode project from `project.yml`, then builds a
Release `.app` signed to **Run Locally** (no paid Apple Developer account
needed). When it finishes it prints the full path, which is:

```
Tock/build/Build/Products/Release/Tock.app
```

Prefer doing it in Xcode? Run `xcodegen generate`, open `Tock.xcodeproj`, and
hit **Run** (⌘R). If Xcode complains about signing, select the **Tock** target →
**Signing & Capabilities** → set Team to *None* / **Sign to Run Locally**, or
pick your personal Apple ID team.

## Run

```bash
open Tock/build/Build/Products/Release/Tock.app
```

A stopwatch icon appears in the menu bar — there is **no dock icon** and no
window; that's intentional. To keep it around, copy it into Applications:

```bash
cp -R Tock/build/Build/Products/Release/Tock.app /Applications/
open /Applications/Tock.app
```

If Gatekeeper blocks it ("unidentified developer"), right-click the app →
**Open** → **Open**, or re-sign in Xcode with your Apple ID team.

## Open at login

Click the menu bar icon → the **⋯** menu → toggle **Launch at login**. This uses
`SMAppService.mainApp`, so the app should live in a stable location
(`/Applications` is ideal) before enabling it.

## Using it

- Pick a project from the dropdown, or click **+** to create one.
- **Start** begins a session; the menu bar switches to a filled stopwatch with
  the elapsed time ticking as `H:MM:SS`. **Stop** finalizes it.
- The panel shows today's total across all projects and the selected project's
  all-time total, plus a scrollable log of recent sessions. Click a session (or
  the pencil that appears on hover) to edit it — change the project, adjust the
  start/end, or trim minutes off the end if you forgot to stop. Hover and click
  the trash to delete one.
- **Export CSV** writes `Project, Start, End, Duration (H:MM:SS),
  Duration (decimal hours)` and reveals the file in Finder — the decimal-hours
  column is for invoicing.

From the **⋯** menu you can turn on **Auto-stop when idle** (after 5/10/15 min
of no keyboard or mouse activity). When it triggers, the session's end is
backdated to the moment activity stopped, so the idle stretch is never counted.
Reading idle time needs no special permission.

If you quit while a timer is running, the session is finalized and saved
automatically (it is never resumed on next launch, to avoid logging idle
overnight time).

## Where the data lives

```
~/Library/Application Support/Tock/data.json
```

Plain Codable JSON, written atomically on every change.
