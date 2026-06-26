# Waymark

A native macOS command center for the projects that make up a life — a calm,
cinematic *expedition journal* that tells you what deserves your focus **today**,
ranked by importance to your real goals, and that knows when you've done
**enough**.

Swift + SwiftUI, macOS 14+. Apple frameworks only. Local-only (no cloud, no
accounts, no network). See [`DESIGN.md`](DESIGN.md) for the philosophy.

## Build & run (on a Mac)

You need macOS with Xcode installed. From this folder:

```bash
./build.sh
```

That will:

1. Install [XcodeGen](https://github.com/yonyz/XcodeGen) via Homebrew if it
   isn't already present.
2. Generate `Waymark.xcodeproj` from [`project.yml`](project.yml).
3. Build a Release, ad-hoc-signed `Waymark.app`.

When it finishes it prints the path. Launch it with:

```bash
open build/Build/Products/Release/Waymark.app
```

…or copy `Waymark.app` into `/Applications` and double-click.

### Prefer Xcode?

```bash
brew install xcodegen   # once
xcodegen generate       # creates Waymark.xcodeproj
open Waymark.xcodeproj
```

Then press ⌘R. The project is configured to sign **ad-hoc**
(`CODE_SIGN_IDENTITY = "-"`) so it runs locally without a paid Apple Developer
account. If Gatekeeper complains, select the Waymark target → Signing &
Capabilities → set signing to *Automatic* and pick your personal Apple ID team.

## Where your data lives

```
~/Library/Application Support/Waymark/data.json
```

Plain JSON, written atomically, saved on every change, loaded on launch. Delete
it to start fresh; back it up to keep your quests.

## Layout

```
project.yml              XcodeGen spec (target, signing, Info.plist)
build.sh                 one-command build
Waymark/
  WaymarkApp.swift       app entry, window
  Models/                Quest, Stage, Deadline, StrategicAxis, ProgressEvent,
                         StrategicTrack, AppData
  Store/
    DataStore.swift      persistence + all mutations (the source of truth)
    Ranking.swift        urgency × strategic weight → short focus list + reasons
  Theme/Theme.swift      palette, type, reusable surfaces
  Views/
    RootView.swift       sidebar navigation
    Today/               TodayView, FocusCard, EnoughView  ← the soul
    Quests/              QuestsView, QuestRow, QuestEditor
    Tracks/              TracksView, TrackCard
    Components/          shared chips, pills, buttons
```

> Built and edited on Linux; **the build step (`xcodebuild`) must run on macOS.**
> The sources are written to compile cleanly on macOS 14+ with Xcode 15+.
