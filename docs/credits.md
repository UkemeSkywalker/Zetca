# Credits

Every AI action in Zetca costs credits. 1 credit = $0.01. Each price is what the action costs Zetca (Bedrock tokens, Higgsfield, Transcribe) plus 40%, with a minimum of 1 credit. The full price list and the reasoning behind it are in [`pricing/Zetca credits and pricing.xlsx`](pricing/).

| Plan | Price | Credits a month | AI images and videos |
|---|---|---|---|
| Free | $0 | 100 | No |
| Starter | $15 | 1,500 | Yes |
| Pro | $39 | 4,000 | Yes, plus the more expensive models |
| Agency | $99 | 10,000 | Every model |

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
