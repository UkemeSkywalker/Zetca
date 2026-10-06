# Zetca AI Social Media Automation Platform

A production-grade web application that provides AI-powered social media automation capabilities.

![Zetca Dashboard](public/images/Dashboard.png)

## Architecture

Zetca is a single Next.js application. The App Router UI and the AI agent API routes
(strategy, copy, scheduler, publisher) run in the same process, sharing the same JWT
auth, DynamoDB repositories, and config. A background scanner (started via
`instrumentation.ts`) polls for scheduled posts that are due and auto-publishes them
to LinkedIn.

```
Browser → Next.js (3000) → App Router pages + /api/* routes → Bedrock / DynamoDB / LinkedIn
```

Agent logic is built on the [Strands Agents TypeScript SDK](https://strandsagents.com/),
using Amazon Bedrock (Claude) as the model provider. Each agent (Strategist, Copywriter,
Scheduler) has a mock counterpart used when `USE_MOCK_AGENT=true`, so the app can run
end-to-end without AWS credentials.

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Iconify Solar
- **Agents**: Strands Agents TypeScript SDK, Zod (structured output schemas)
- **AI**: Amazon Bedrock (Claude) via Strands Agents
- **Database**: DynamoDB (users, strategies, copies, scheduled-posts, publish-log, post-media)
- **Infra**: Docker, Docker Compose, Caddy, Terraform (DynamoDB + S3 provisioning)
- **Testing**: Jest, React Testing Library, fast-check

## Getting Started

### Prerequisites

- Node.js 22+ (required by `@strands-agents/sdk`)
- AWS account with Bedrock access enabled
- AWS credentials configured (for DynamoDB, Bedrock, and S3)

### Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your JWT_SECRET, AWS credentials, and other values
npm run dev
```

### Running with Docker Compose

```bash
# Make sure .env.local is configured
docker-compose up --build
```

This starts Caddy on `:80` in front of the Next.js app on `:3000`.

### Environment Variables

See `.env.local.example` for the full list. Key groups:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret for JWT token signing/validation |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS credentials for DynamoDB, Bedrock, S3 |
| `BEDROCK_MODEL_ID` | Bedrock model (default: `anthropic.claude-sonnet-4-6`) |
| `DYNAMODB_*_TABLE_NAME` | DynamoDB table names for each resource |
| `USE_MOCK_AGENT` | Set `true` to skip Bedrock and use mock agents |
| `PUBLISHER_ENABLED`, `PUBLISHER_SCAN_INTERVAL_SECONDS` | Background LinkedIn auto-publish scanner |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` | LinkedIn OAuth |

## Project Structure

```
zetca-platform/
├── app/
│   ├── api/
│   │   ├── auth/            # Login, signup, LinkedIn OAuth
│   │   ├── media/           # S3 media upload/download
│   │   ├── strategy/        # Strategist agent routes
│   │   ├── copy/            # Copywriter agent routes (incl. SSE streaming)
│   │   ├── scheduler/       # Scheduler agent + CRUD routes
│   │   └── publisher/       # LinkedIn publishing routes
│   └── dashboard/           # App Router pages
├── components/       # Reusable React components
├── types/             # Shared TypeScript types
├── lib/
│   ├── agents/             # Strands agents (real + mock)
│   ├── models/             # Zod schemas / wire-format types
│   ├── services/           # Business logic, service container, publish scanner
│   ├── db/                 # DynamoDB repositories
│   ├── auth/, middleware/  # JWT auth
│   └── api/                # Frontend API clients + route helpers
├── instrumentation.ts  # Starts the publish scanner at server boot
├── terraform/          # Infrastructure as Code (DynamoDB tables, S3 buckets)
└── docker-compose.yml
```

## Available Scripts

- `npm run dev` — Start Next.js dev server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
- `npm run type-check` — Run TypeScript type checking
- `npm test` — Run Jest tests

**Docker:**
- `docker-compose up --build` — Build and start the stack
- `docker-compose down` — Stop all services

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/strategy/generate` | JWT | Generate a new strategy |
| `GET` | `/api/strategy/list` | JWT | List user's saved strategies |
| `GET` | `/api/strategy/{id}` | JWT | Get a specific strategy |
| `POST` | `/api/copy/generate` | JWT | Generate copies from a strategy |
| `POST` | `/api/copy/generate-stream` | JWT | Same, streamed via SSE |
| `GET` | `/api/copy/list/{strategyId}` | JWT | List copies for a strategy |
| `GET`/`DELETE` | `/api/copy/{copyId}` | JWT | Get / delete a copy |
| `POST` | `/api/copy/{copyId}/chat` | JWT | Chat-refine a copy |
| `POST` | `/api/copy/refine-text` | JWT | Refine arbitrary text |
| `POST` | `/api/scheduler/auto-schedule` | JWT | AI-schedule all copies for a strategy |
| `POST` | `/api/scheduler/manual-schedule` | JWT | Manually schedule one copy |
| `GET`/`PUT`/`DELETE` | `/api/scheduler/posts/{postId}` | JWT | CRUD a scheduled post |
| `GET` | `/api/scheduler/posts` | JWT | List user's scheduled posts |
| `POST` | `/api/publisher/publish/{postId}` | JWT | Publish a post to LinkedIn on demand |
| `GET` | `/api/publisher/logs` | JWT | List publish attempt logs |

## Features

- AI Strategy Generator (Strands Agent + Bedrock)
- Smart Copywriting
- Content Scheduler
- Image Designer
- Content Publisher (LinkedIn, auto + on-demand)
- Analytics Dashboard
- Profile Management

## Troubleshooting

**"Could not connect to Bedrock" / 503 errors**
- Confirm `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` are set correctly in `.env.local`
- Verify Bedrock model access is enabled in your AWS account for the configured region
- Try setting `USE_MOCK_AGENT=true` to bypass Bedrock and test the rest of the flow

**401 Unauthorized on agent endpoints**
- Log in again to get a fresh token — tokens expire

**Strategy/copy/scheduling generation times out (504)**
- The default timeout is 60 seconds. Bedrock can be slow on first calls. Retry once.
- Increase `AGENT_TIMEOUT_SECONDS` in `.env.local` if needed

**DynamoDB errors**
- Ensure the relevant table exists. Provision infra with: `cd terraform && terraform init && terraform apply`
- Verify the `DYNAMODB_*_TABLE_NAME` env vars match the actual table names in AWS

**Scheduled posts aren't auto-publishing**
- Confirm `PUBLISHER_ENABLED=true` and the server process is the long-running `next start` (not a serverless deploy)
- Check server logs for "Publish Scanner started" at boot
