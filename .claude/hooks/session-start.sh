#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions, where the container
# starts with a fresh checkout and no installed dependencies.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Install JS dependencies so linters, type-checks, tests, and builds work.
# Use `npm install` (not `npm ci`) so a partially-cached node_modules is
# reused on warm containers; it is idempotent and safe to re-run.
echo "[session-start] Installing npm dependencies..."
npm install --no-audit --no-fund

echo "[session-start] Dependencies installed."
