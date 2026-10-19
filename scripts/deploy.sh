#!/usr/bin/env bash
#
# Deploy a commit (default: origin/master) to the Lightsail app server.
#
#   DEPLOY_HOST=<server ip> scripts/deploy.sh            # deploy origin/master
#   DEPLOY_HOST=<server ip> DEPLOY_REF=<sha> scripts/deploy.sh
#
# Ships that commit's files (never your working tree or .env files), builds the
# image on the server, then swaps the running app over. The server's settings
# live in /opt/zetca/.env.production (see scripts/configure-prod-server.sh).

set -euo pipefail

HOST="${DEPLOY_HOST:?Set DEPLOY_HOST to the server IP (terraform output app_server_ip)}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/zetca-lightsail}"
REF="${DEPLOY_REF:-origin/master}"
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "ubuntu@$HOST")

git fetch -q origin
SHA=$(git rev-parse --short "$REF")
echo "Deploying $REF ($SHA) to $HOST"

# Copy the commit's files to a fresh release directory
git archive --format=tar.gz "$REF" | "${SSH[@]}" "rm -rf /opt/zetca/release && mkdir -p /opt/zetca/release && tar xz -C /opt/zetca/release"

"${SSH[@]}" SHA="$SHA" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/zetca
test -f .env.production || { echo "Missing /opt/zetca/.env.production — run scripts/configure-prod-server.sh first"; exit 1; }
test -f /var/lib/cloud/instance/zetca-ready || { echo "Server setup (Docker install) hasn't finished yet; try again in a minute"; exit 1; }

# Compose reads DOMAIN/WWW_DOMAIN for Caddy from the same file, and the app gets it via APP_ENV_FILE
export APP_ENV_FILE=/opt/zetca/.env.production
COMPOSE=(docker compose -p zetca --env-file /opt/zetca/.env.production -f release/docker-compose.yml)

# Check the new Caddy config, then build while the current version keeps serving
# -T and </dev/null: this script arrives on stdin, and `run` would otherwise read (and swallow) the rest of it
if ! out=$("${COMPOSE[@]}" run -T --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile </dev/null 2>&1); then
  echo "$out"; echo "The new Caddyfile is invalid; nothing was changed."; exit 1
fi
"${COMPOSE[@]}" build --pull frontend

# Swap the release in and restart on the new image
rm -rf app.previous
if [ -d app ]; then mv app app.previous; fi
mv release app
COMPOSE=(docker compose -p zetca --env-file /opt/zetca/.env.production -f app/docker-compose.yml)
"${COMPOSE[@]}" up -d --build --remove-orphans
# Caddy mounts the Caddyfile by path; restart it so it reads the new one
"${COMPOSE[@]}" restart caddy
echo "$SHA" > DEPLOYED_SHA
docker image prune -f >/dev/null

# Wait for the app to answer through Caddy
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null -H "Host: $(grep -E '^DOMAIN=' .env.production | cut -d= -f2 || true)" http://localhost/login; then
    echo "Deployed $SHA — the app is answering."
    exit 0
  fi
  sleep 2
done
echo "Deployed $SHA, but the app didn't answer within a minute. Check: docker compose -p zetca logs frontend"
exit 1
REMOTE
