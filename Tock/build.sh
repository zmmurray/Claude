#!/usr/bin/env bash
#
# Build Tock.app from scratch. Run from the Tock/ directory on macOS 14+.
#
#   ./build.sh
#
# Produces ./build/Build/Products/Release/Tock.app
#
set -euo pipefail
cd "$(dirname "$0")"

# 1. Make sure XcodeGen is available (used to generate the .xcodeproj).
if ! command -v xcodegen >/dev/null 2>&1; then
  echo "XcodeGen not found — installing via Homebrew…"
  brew install xcodegen
fi

# 2. Generate the Xcode project from project.yml.
xcodegen generate

# 3. Build a signed-to-run-locally Release build.
xcodebuild \
  -project Tock.xcodeproj \
  -scheme Tock \
  -configuration Release \
  -derivedDataPath build \
  CODE_SIGN_IDENTITY="-" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=YES \
  build

APP="build/Build/Products/Release/Tock.app"
echo
echo "✅ Built: $(cd "$(dirname "$APP")" && pwd)/$(basename "$APP")"
echo "   Launch it with:  open \"$APP\""
echo "   Install it with: cp -R \"$APP\" /Applications/"
