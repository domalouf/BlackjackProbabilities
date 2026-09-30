#!/usr/bin/env bash
#
# Build Blackjack Probabilities and publish it to https://domalouf.com/blackjack/.
#
# The server (`lts`) serves domalouf.com from the site's web root, ~/site/www/
# (the MyWebsite repo's stack; every project publishes into it). This script
# rsyncs the built site into its `blackjack/` sub-directory, leaving the other
# projects' untouched. Static files are live immediately — no nginx reload.
#
# The nginx `location /` block already does `try_files $uri $uri/ =404`, so a
# request for /blackjack/ resolves to /blackjack/index.html with no config
# change.
#
# Config via environment (optional):
#   DEPLOY_DEST     rsync destination (default: lts:site/www/blackjack/)
#   BASE_PATH   app base path     (default: /blackjack/)
#
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest="${DEPLOY_DEST:-lts:site/www/blackjack/}"
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
