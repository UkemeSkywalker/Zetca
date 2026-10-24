# Credits

Every AI action in Zetca costs credits. 1 credit = $0.01. Each price is what the action costs Zetca (Bedrock tokens, Higgsfield, Transcribe) plus 40%, with a minimum of 1 credit. The full price list and the reasoning behind it are in [`pricing/Zetca credits and pricing.xlsx`](pricing/).

| Plan | Price | Credits a month | AI images and videos |
|---|---|---|---|
| Free | $0 | 100 | No |
| Starter | $15 | 1,500 | Yes |
| Pro | $39 | 4,000 | Yes, plus the more expensive models |
| Agency | $99 | 10,000 | Every model |

Every account, Free included, also gets **5 AI images and 2 AI videos free, once**, on the default models (Soul V2 and Kling 2.5 Turbo). They're used before credits, and a failed one is given back. The counts are `freeImagesUsed` and `freeVideosUsed` on the user record.

**Draft videos:** Wan 3.0 can make a 480p draft (36 credits). If the user likes it, the editor's **Make it sharper** makes an HD 720p (70 credits) or Full HD 1080p (140 credits, Pro) version from the draft's first frame, prompt and seed. AI video isn't exact, so the HD version is very close to the draft but not identical.

Monthly credits reset on the 1st of each month (UTC). Top-up credits don't reset, and they're spent once the month's credits run out. If an action fails, its credits are given back.

Plans and prices live in `lib/billing/plans.ts`, `lib/billing/prices.ts` and `lib/billing/aiModels.ts`.

## Managing a user's credits

Until card payments exist, you can see a user's credits, add credits or change their plan from your machine with `scripts/credits.mjs`:

- `show` prints the balance
- `grant <n>` adds top-up credits (an optional note after the number is saved in the ledger)
- `plan <name>` changes the plan (`free`, `starter`, `pro` or `agency`)

```bash
node --env-file=.env scripts/credits.mjs show you@example.com --prod
```

```bash
node --env-file=.env scripts/credits.mjs grant you@example.com 500 "launch bonus" --prod
```

```bash
node --env-file=.env scripts/credits.mjs plan you@example.com starter --prod
```

Leave off `--prod` to use the dev tables (`users-dev`, `credit-ledger-dev`). With `--prod`, the AWS keys in `.env` need access to `users-prod` and `credit-ledger-prod`.

## Where usage is recorded

Every charge, refund and grant goes in the `credit-ledger-{env}` DynamoDB table. Each entry has the action, the credits, the real Bedrock tokens or Higgsfield model, and the cost in dollars. Entries are kept for 400 days. Users see their own recent usage on the Billing page, without the costs or token counts.
