#!/usr/bin/env bash
#
# Runs ON the app server (CI copies it there with the release files):
# switch the app to a prebuilt image from ECR.
#
#   IMAGE=<ecr repo url>:<commit sha> bash /opt/zetca/release/scripts/remote-release.sh
#
# Expects /opt/zetca/release/ to hold that commit's docker-compose.yml and
# Caddyfile, and /opt/zetca/.env.production the app's settings and AWS keys.

set -euo pipefail
: "${IMAGE:?Set IMAGE to the image to deploy}"
cd /opt/zetca
test -f .env.production || { echo "Missing /opt/zetca/.env.production"; exit 1; }

export APP_ENV_FILE=/opt/zetca/.env.production APP_IMAGE="$IMAGE"
REGISTRY="${IMAGE%%/*}"
REGION="$(echo "$REGISTRY" | cut -d. -f4)"

# Log in to ECR with the app's own (pull-only) keys, using the AWS CLI image so nothing needs installing
docker run --rm --env-file .env.production -e AWS_REGION="$REGION" public.ecr.aws/aws-cli/aws-cli:latest \
  ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null

COMPOSE=(docker compose -p zetca --env-file /opt/zetca/.env.production -f release/docker-compose.yml)
"${COMPOSE[@]}" pull --quiet frontend
if ! out=$("${COMPOSE[@]}" run -T --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile </dev/null 2>&1); then
  echo "$out"; echo "The new Caddyfile is invalid; nothing was changed."; exit 1
fi

# Swap the release in and restart on the new image
rm -rf app.previous
if [ -d app ]; then mv app app.previous; fi
mv release app
COMPOSE=(docker compose -p zetca --env-file /opt/zetca/.env.production -f app/docker-compose.yml)
"${COMPOSE[@]}" up -d --no-build --remove-orphans
"${COMPOSE[@]}" restart caddy
echo "$IMAGE" > DEPLOYED_IMAGE
basename "$IMAGE" | cut -d: -f2 | cut -c1-7 > DEPLOYED_SHA
docker image prune -f >/dev/null

DOMAIN="$(grep -E '^DOMAIN=' .env.production | cut -d= -f2)"
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/login"; then
    echo "Live: $IMAGE"
    exit 0
  fi
  sleep 2
done
echo "Deployed $IMAGE, but https://$DOMAIN/login didn't answer within a minute."
"${COMPOSE[@]}" logs --tail 40 frontend
exit 1
