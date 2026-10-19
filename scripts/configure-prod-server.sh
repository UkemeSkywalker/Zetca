#!/usr/bin/env bash
#
# Write the app server's settings file, /opt/zetca/.env.production.
#
#   scripts/configure-prod-server.sh            # create it (refuses to overwrite)
#   scripts/configure-prod-server.sh --force    # replace it (also rotates JWT_SECRET,
#                                               # which signs everyone out)
#
# Table names, the media bucket and the app's AWS keys come from Terraform's
# prod workspace; LINKEDIN_CLIENT_ID/SECRET come from your local .env; a new
# JWT_SECRET is generated. The file is streamed straight to the server, so the
# secrets are never written to disk here.

set -euo pipefail
cd "$(dirname "$0")/.."

FORCE="${1:-}"
DOMAIN="${APP_DOMAIN:-zetca.pro}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/zetca-lightsail}"

tf() { terraform -chdir=terraform output -raw "$1"; }
[ "$(terraform -chdir=terraform workspace show)" = "prod" ] || { echo "Run: terraform -chdir=terraform workspace select prod"; exit 1; }

HOST="$(tf app_server_ip)"
ENV=prod
local_env() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
LINKEDIN_CLIENT_ID="$(local_env LINKEDIN_CLIENT_ID)"
LINKEDIN_CLIENT_SECRET="$(local_env LINKEDIN_CLIENT_SECRET)"
[ -n "$LINKEDIN_CLIENT_ID" ] || echo "Note: no LINKEDIN_CLIENT_ID in .env; LinkedIn sign-in will be off until you add it on the server."

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "ubuntu@$HOST")
if [ "$FORCE" != "--force" ] && "${SSH[@]}" test -f /opt/zetca/.env.production; then
  echo "/opt/zetca/.env.production already exists on $HOST. Use --force to replace it (this signs everyone out)."
  exit 1
fi

{
  cat <<EOF
# Written by scripts/configure-prod-server.sh — keep this file private (chmod 600)
DOMAIN=$DOMAIN
WWW_DOMAIN=www.$DOMAIN

JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=$(tf app_aws_access_key_id)
AWS_SECRET_ACCESS_KEY=$(tf app_aws_secret_access_key)

DYNAMODB_TABLE_NAME=$(tf dynamodb_users_table_name)
DYNAMODB_STRATEGIES_TABLE_NAME=$(tf dynamodb_strategies_table_name)
DYNAMODB_COPIES_TABLE_NAME=$(tf dynamodb_copies_table_name)
DYNAMODB_SCHEDULED_POSTS_TABLE_NAME=$(tf dynamodb_scheduled_posts_table_name)
DYNAMODB_PUBLISH_LOG_TABLE_NAME=$(tf dynamodb_publish_log_table_name)
DYNAMODB_MEDIA_TABLE_NAME=$(tf dynamodb_post_media_table_name)
S3_MEDIA_BUCKET=$(tf s3_post_media_bucket_name)

BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6
USE_MOCK_AGENT=false
AGENT_TIMEOUT_SECONDS=120

LINKEDIN_CLIENT_ID=$LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET=$LINKEDIN_CLIENT_SECRET
LINKEDIN_REDIRECT_URI=https://$DOMAIN/api/auth/linkedin/callback

PUBLISHER_ENABLED=true
PUBLISHER_SCAN_INTERVAL_SECONDS=60
LINKEDIN_API_TIMEOUT_SECONDS=30
EOF
} | "${SSH[@]}" "umask 077 && mkdir -p /opt/zetca && cat > /opt/zetca/.env.production"

echo "Wrote /opt/zetca/.env.production on $HOST (environment: $ENV, domain: $DOMAIN)."
