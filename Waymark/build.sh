#!/usr/bin/env bash
# Build Waymark into a runnable, ad-hoc-signed .app.
# Requires macOS with Xcode + command line tools. Installs XcodeGen via Homebrew if missing.
set -euo pipefail

cd "$(dirname "$0")"

# 1. XcodeGen — generates Waymark.xcodeproj from project.yml
if ! command -v xcodegen >/dev/null 2>&1; then
  echo "→ XcodeGen not found; installing via Homebrew…"
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is required. Install from https://brew.sh then re-run." >&2
    exit 1
  fi
  brew install xcodegen
fi

echo "→ Generating Xcode project…"
xcodegen generate

# 2. Build (ad-hoc signed so it launches without a paid developer account)
echo "→ Building (Release)…"
xcodebuild \
  -project Waymark.xcodeproj \
  -scheme Waymark \
  -configuration Release \
  -derivedDataPath build \
  CODE_SIGN_IDENTITY="-" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=YES \
  build

APP_PATH="build/Build/Products/Release/Waymark.app"
echo ""
echo "✓ Built: $(pwd)/$APP_PATH"
echo "  Launch with:  open \"$(pwd)/$APP_PATH\""
echo "  Or copy it to /Applications and double-click."
