#!/bin/bash
# Sets up macOS login startup (launchd) and wake-from-sleep (pmset)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_NAME="com.technews.aggregator.plist"
PLIST_SOURCE="$SCRIPT_DIR/$PLIST_NAME"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_DEST="$LAUNCH_AGENTS_DIR/$PLIST_NAME"

echo ""
echo "--- Step 1: Login Startup (launchd) ---"
echo ""

if [ ! -f "$PLIST_SOURCE" ]; then
    echo "ERROR: $PLIST_SOURCE not found."
    exit 1
fi

mkdir -p "$LAUNCH_AGENTS_DIR"

# Unload existing agent if present
if [ -f "$PLIST_DEST" ]; then
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

cp "$PLIST_SOURCE" "$PLIST_DEST"
launchctl load "$PLIST_DEST"
echo "  ✓ PM2 will resurrect on login"

echo ""
echo "--- Step 2: Wake-from-Sleep (pmset) ---"
echo ""
echo "Setting Mac to wake at 8:58 AM and 5:58 PM daily."
echo "Requires sudo (admin password)."
echo ""

sudo pmset repeat wakeorpoweron MTWRFSU 08:58:00 wakeorpoweron MTWRFSU 17:58:00

echo ""
echo "  ✓ Wake schedule set"

echo ""
echo "--- Verification ---"
echo ""
echo "Launch Agent:"
launchctl list | grep com.technews.aggregator && echo "  ✓ Agent loaded" || echo "  ⚠ Agent not found"
echo ""
echo "Wake Schedule:"
pmset -g sched
echo ""
echo "Done! Your Mac will wake for digests at 9 AM and 6 PM."
echo ""
echo "To undo:"
echo "  launchctl unload ~/Library/LaunchAgents/$PLIST_NAME"
echo "  rm ~/Library/LaunchAgents/$PLIST_NAME"
echo "  sudo pmset repeat cancel"
echo ""
