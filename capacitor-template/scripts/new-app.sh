#!/usr/bin/env bash
#
# Scaffolds an ios/ Capacitor project for an app, pointed at its deployed
# URL in "remote mode" (see
# https://github.com/davidcblake/plug-and-play/blob/main/docs/architecture.md).
#
# REQUIRES macOS + Xcode + CocoaPods. `npx cap add ios` shells out to
# CocoaPods and generates an Xcode project; neither exists on Linux, so
# this cannot be run in a cloud/Linux Claude Code session. Run it on your
# Mac, from the root of the target app's repo.
#
# Usage:
#   ./new-app.sh <app-name> <remote-url> <bundle-id>
#
# Example:
#   ./new-app.sh Dossier https://dossier.vercel.app com.yourname.dossier

set -euo pipefail

APP_NAME="${1:?Usage: new-app.sh <app-name> <remote-url> <bundle-id>}"
REMOTE_URL="${2:?Usage: new-app.sh <app-name> <remote-url> <bundle-id>}"
BUNDLE_ID="${3:?Usage: new-app.sh <app-name> <remote-url> <bundle-id>}"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "error: new-app.sh must be run on macOS (needs Xcode + CocoaPods)." >&2
  exit 1
fi

if [[ ! -f package.json ]]; then
  echo "error: run this from the root of the app's repo (no package.json found here)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Installing Capacitor CLI + core"
npx --yes @capacitor/cli@6 --version >/dev/null
pnpm add -D @capacitor/cli@^6
pnpm add @capacitor/core@^6 @capacitor/ios@^6

echo "==> Initializing Capacitor (remote mode)"
npx cap init "$APP_NAME" "$BUNDLE_ID" --web-dir public

echo "==> Writing capacitor.config.ts from template"
sed -e "s#__BUNDLE_ID__#${BUNDLE_ID}#g" \
    -e "s#__APP_NAME__#${APP_NAME}#g" \
    -e "s#__REMOTE_URL__#${REMOTE_URL}#g" \
    "$TEMPLATE_DIR/capacitor.config.ts.template" > capacitor.config.ts

echo "==> Adding iOS platform (requires CocoaPods)"
npx cap add ios
npx cap sync ios

cat <<EOF

Done. Next steps:
  1. open ios/App/App.xcworkspace
  2. In Xcode: select a signing team (Track A: your personal Apple ID —
     see https://github.com/davidcblake/plug-and-play/blob/main/docs/distribution.md),
     then Run on your device.
  3. Add @plugplay/native-bridge as a workspace dependency when you're
     ready to wire up push/secure-storage/biometrics
     (https://github.com/davidcblake/plug-and-play/tree/main/packages/native-bridge).
EOF
