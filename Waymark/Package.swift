// swift-tools-version: 5.9
// Backup way to run Waymark: double-click this file to open it in Xcode, then
// press the ▶ (Play) button. The primary, no-code path is the cloud build that
// publishes a ready-to-run app — see README.md.
import PackageDescription

let package = Package(
    name: "Waymark",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "Waymark",
            path: "Waymark",
            resources: [.process("Assets.xcassets")]
        )
    ]
)
