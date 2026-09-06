#!/usr/bin/env bash
#
# Build Blackjack Probabilities and publish it to https://domalouf.com/blackjack/.
#
# The Pi runs the HealthBoard docker-compose stack; nginx serves
# ~/HealthBoard/piStuff/website/ (bind-mounted read-only into the container).
# This script rsyncs the built site into the `blackjack/` sub-directory of that
# web root, leaving the landing page and /sleep/ /api/ paths untouched. Static
# files are live immediately — no nginx reload.
#
# The nginx `location /` block already does `try_files $uri $uri/ =404`, so a
# request for /blackjack/ resolves to /blackjack/index.html with no config
# change. HealthBoard's .gitignore excludes piStuff/website/blackjack/ so
# `git pull --ff-only` on the Pi stays clean.
#
# Config via environment (optional):
#   PI_DEST     rsync destination (default: pi:HealthBoard/piStuff/website/blackjack/)
#   BASE_PATH   app base path     (default: /blackjack/)
#
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest="${PI_DEST:-pi:HealthBoard/piStuff/website/blackjack/}"
export BASE_PATH="${BASE_PATH:-/blackjack/}"

log() { printf '==> %s\n' "$*"; }

cd "$repo"

log "running tests"
npm test

log "building (base=$BASE_PATH)"
npm run build

log "publishing dist/ -> $dest"
# --delete so removed assets don't linger; trailing slashes matter.
rsync -av --delete dist/ "$dest"

log "done — https://domalouf.com/blackjack/"
