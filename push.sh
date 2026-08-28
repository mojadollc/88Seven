#!/bin/bash
# ============================================================
# push.sh — Sync all files to VPS and run setup
# Usage: bash push.sh
# ============================================================

VPS="root@188.166.250.245"
APP_DIR="/var/www/88-seven"

echo ""
echo "🚀 Pushing 88-seven.com to VPS..."
echo ""

# ─── SYNC ALL FILES ─────────────────────────────────────────
echo "▶ Syncing all files to VPS..."
rsync -az --progress \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  ./ $VPS:$APP_DIR/

echo "✓ Files synced"

# ─── RUN SETUP ON VPS ───────────────────────────────────────
echo "▶ Running setup on VPS..."
ssh $VPS "bash $APP_DIR/setup-vps.sh"
