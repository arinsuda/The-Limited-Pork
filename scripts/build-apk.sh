#!/usr/bin/env bash
set -e

# ==============================================================================
# Script to build Android APK using Capacitor and Docker Android SDK
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "==> 1. Building Frontend Web Assets..."
cd "$FRONTEND_DIR"
npm run build

echo "==> 2. Syncing Capacitor Android..."
npx cap sync android

echo "==> 3. Compiling Android APK with Docker (Android SDK 34)..."
docker run --rm \
  --platform linux/amd64 \
  -v "$FRONTEND_DIR":/workspace \
  -w /workspace/android \
  ghcr.io/cirruslabs/android-sdk:34 \
  ./gradlew assembleDebug --no-daemon

APK_SOURCE="$FRONTEND_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
APK_DEST="$ROOT_DIR/moo-krob-app.apk"
APK_PUBLIC="$FRONTEND_DIR/public/moo-krob-app.apk"

if [ -f "$APK_SOURCE" ]; then
  cp "$APK_SOURCE" "$APK_DEST"
  cp "$APK_SOURCE" "$APK_PUBLIC"
  echo "=========================================================="
  echo " [SUCCESS] APK Built successfully!"
  echo " File Location: $APK_DEST"
  echo " Size: $(ls -lh "$APK_DEST" | awk '{print $5}')"
  echo "=========================================================="
else
  echo "[ERROR] APK file not found at $APK_SOURCE"
  exit 1
fi
