# Deploying Zetca (Lightsail)

Production runs on a single Lightsail server: the app's Docker image plus Caddy, which serves `zetca.com` over HTTPS. The app needs a server that stays running, for the LinkedIn publisher loop and the Copywriter's background jobs, which is why it isn't on Amplify or Vercel.

## One-time setup

1. **Infrastructure.** Run this from `terraform/`:

   ```bash
   terraform init
   terraform workspace new prod        # or: terraform workspace select prod
   terraform apply -var-file=prod.tfvars
   ```

   It creates:
   - the `-prod` DynamoDB tables and media bucket
   - the Lightsail server ($12/mo) with a static IP and open ports for 22, 80 and 443
   - the `zetca-prod-app` IAM user, which can only reach the prod tables, the bucket and Claude on Bedrock

   Each workspace has its own state, and the default workspace is dev, so this never touches the dev tables.

2. **DNS at Porkbun.** Point the domain at `terraform output app_server_ip` with two records:
   - `A` record for `zetca.com`
   - `A` record (or a `CNAME` to `zetca.com`) for `www`

3. **LinkedIn app.** Add `https://zetca.com/api/auth/linkedin/callback` as an authorised redirect URL.

4. **Server settings.** Wait about two minutes after the apply, so the server can finish installing Docker. Then run:

   ```bash
   scripts/configure-prod-server.sh
   ```

   This writes `/opt/zetca/.env.production` on the server: prod table names, the app's AWS keys, a new JWT secret, and the LinkedIn app from your `.env`.

## Deploying

```bash
DEPLOY_HOST=$(terraform -chdir=terraform output -raw app_server_ip) scripts/deploy.sh
```

This deploys `origin/master`. Set `DEPLOY_REF=<commit>` to deploy something else.

The image is built on the server while the current version keeps serving, then swapped in. The previous release is kept at `/opt/zetca/app.previous`.

## On the server

```bash
ssh -i ~/.ssh/zetca-lightsail ubuntu@<ip>
cd /opt/zetca
docker compose -p zetca -f app/docker-compose.yml --env-file .env.production logs -f frontend   # app logs
cat DEPLOYED_SHA                                                                                 # what's live
```
