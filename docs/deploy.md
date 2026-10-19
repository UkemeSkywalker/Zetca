# Deploying Zetca (Lightsail)

Production runs on a single Lightsail server: the app's Docker image plus Caddy, which serves `zetca.pro` over HTTPS. The app needs a server that stays running, for the LinkedIn publisher loop and the Copywriter's background jobs, which is why it isn't on Amplify or Vercel.

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
   - `A` record for `zetca.pro`
   - `A` record (or a `CNAME` to `zetca.pro`) for `www`

3. **LinkedIn app.** Add `https://zetca.pro/api/auth/linkedin/callback` as an authorised redirect URL.

4. **Server settings.** Wait about two minutes after the apply, so the server can finish installing Docker. Then run:

   ```bash
   scripts/configure-prod-server.sh
   ```

   This writes `/opt/zetca/.env.production` on the server: prod table names, the app's AWS keys, a new JWT secret, and the LinkedIn app from your `.env`.

## Deploying

**Automatic (normal path).** Every push to `master` runs `.github/workflows/deploy.yml`:

1. CI: lint, type-check, tests and build (`ci.yml`, which also runs on every pull request).
2. Build the Docker image and push it to ECR as `zetca:<commit sha>`. ECR keeps the last 10 images.
3. Copy that commit's `docker-compose.yml`, `Caddyfile` and `scripts/remote-release.sh` to the server, which pulls the image and swaps it in.
4. Check that https://zetca.pro/login answers.

GitHub signs in to AWS through OIDC (the `zetca-prod-github-deploy` role, which can only push to the `zetca` ECR repo), so no AWS keys are stored in GitHub. The repository holds:

- **Variables:** `AWS_DEPLOY_ROLE_ARN`, `ECR_REPOSITORY_URL` and `DEPLOY_HOST`.
- **Secrets, in the `production` environment:** `DEPLOY_SSH_KEY` (a key used only by CI) and `DEPLOY_KNOWN_HOSTS` (the server's pinned fingerprint).

**Roll back** by re-running the Deploy workflow for an earlier commit, or on the server:

```bash
IMAGE=<ecr url>:<older sha> bash /opt/zetca/app/scripts/remote-release.sh
```

That form needs a release directory first. The simplest route is re-running the workflow from GitHub's Actions tab.

**Manual fallback** (builds on the server, no ECR):

```bash
DEPLOY_HOST=$(terraform -chdir=terraform output -raw app_server_ip) scripts/deploy.sh
```

## On the server

```bash
ssh -i ~/.ssh/zetca-lightsail ubuntu@<ip>
cd /opt/zetca
docker compose -p zetca -f app/docker-compose.yml --env-file .env.production logs -f frontend   # app logs
cat DEPLOYED_SHA                                                                                 # what's live
```
