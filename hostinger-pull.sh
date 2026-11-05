#!/bin/sh
# hostinger-pull.sh — keep a web root equal to the `deploy` branch of the repository.
# Runs from a cron job on the hosting account:
#   curl -fsSL https://raw.githubusercontent.com/mJunaid97/IBMready/deploy/hostinger-pull.sh | sh -s -- /path/to/public_html/medical
# Uses git when available, otherwise downloads the branch as a zip. Prints one line per run.
set -u
ROOT="${1:?web root path required}"
REPO="${2:-https://github.com/mJunaid97/IBMready.git}"
BRANCH="${3:-deploy}"
ZIP_URL="https://codeload.github.com/mJunaid97/IBMready/zip/refs/heads/$BRANCH"
mkdir -p "$ROOT" && cd "$ROOT" || exit 1
if command -v git >/dev/null 2>&1; then
  if [ ! -d .git ]; then git init -q && git remote add origin "$REPO"; fi
  if git fetch -q --depth 1 origin "$BRANCH" && git checkout -q -f -B "$BRANCH" "origin/$BRANCH"; then
    git clean -q -fd -e .well-known
    echo "git deploy $(git rev-parse --short HEAD) $(date -u +%Y-%m-%dT%H:%M:%SZ) ok"; exit 0
  fi
  echo "git path failed, trying zip" >&2
fi
TMP="${HOME:-/tmp}/tmp/hb-deploy"; rm -rf "$TMP"; mkdir -p "$TMP"
if curl -fsSL "$ZIP_URL" -o "$TMP/site.zip" && unzip -oq "$TMP/site.zip" -d "$TMP"; then
  cp -a "$TMP"/IBMready-"$BRANCH"/. "$ROOT"/ && rm -rf "$TMP" && echo "zip deploy $(date -u +%Y-%m-%dT%H:%M:%SZ) ok"; exit 0
fi
echo "deploy failed" >&2; exit 1
