/**
 * See or change a user's credits and plan (until card payments are built).
 *
 * Usage:
 *   node --env-file=.env scripts/credits.mjs show  <email>
 *   node --env-file=.env scripts/credits.mjs grant <email> <credits> [note]
 *   node --env-file=.env scripts/credits.mjs plan  <email> <free|starter|pro|agency>
 *
 * Add --prod to use the prod tables (users-prod, credit-ledger-prod); the AWS
 * keys in the environment need access to them.
 *
 * Granted credits are top-up credits: they're spent once the month's plan
 * credits run out, and don't reset.
 */

import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const PLANS = { free: 100, starter: 1500, pro: 4000, agency: 10000 };

const args = process.argv.slice(2).filter((a) => a !== '--prod');
const env = process.argv.includes('--prod') ? 'prod' : 'dev';
const USERS = process.env.DYNAMODB_TABLE_NAME && env === 'dev' ? process.env.DYNAMODB_TABLE_NAME : `users-${env}`;
const LEDGER = process.env.DYNAMODB_CREDIT_LEDGER_TABLE_NAME && env === 'dev' ? process.env.DYNAMODB_CREDIT_LEDGER_TABLE_NAME : `credit-ledger-${env}`;

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }), {
  marshallOptions: { removeUndefinedValues: true },
});

const month = new Date().toISOString().slice(0, 7);

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node --env-file=.env scripts/credits.mjs show|grant|plan <email> [credits|plan] [note] [--prod]');
  process.exit(1);
}

async function findUser(email) {
  const r = await doc.send(
    new QueryCommand({ TableName: USERS, IndexName: 'EmailIndex', KeyConditionExpression: 'email = :e', ExpressionAttributeValues: { ':e': email } }),
  );
  const user = r.Items?.[0];
  if (!user) usage(`No user with the email ${email} in ${USERS}`);
  return user.userId;
}

async function show(userId) {
  const { Item: u } = await doc.send(new GetCommand({ TableName: USERS, Key: { userId } }));
  const plan = PLANS[u.plan] ? u.plan : 'free';
  const used = u.creditsMonth === month ? (u.creditsUsed ?? 0) : 0;
  const bonus = Math.max(0, u.creditsBonus ?? 0);
  console.log(
    `${u.email} (${env}): ${plan} plan · ${used} of ${PLANS[plan]} used this month · ${bonus} top-up · ${Math.max(0, PLANS[plan] - used) + bonus} left`,
  );
}

async function main() {
  const [command, email, value, ...note] = args;
  if (!command || !email) usage();
  const userId = await findUser(email);

  if (command === 'grant') {
    const credits = Number(value);
    if (!Number.isInteger(credits) || credits <= 0) usage('Credits must be a whole number above 0');
    await doc.send(
      new UpdateCommand({ TableName: USERS, Key: { userId }, UpdateExpression: 'ADD creditsBonus :n', ExpressionAttributeValues: { ':n': credits } }),
    );
    const now = new Date();
    await doc
      .send(
        new PutCommand({
          TableName: LEDGER,
          Item: {
            userId,
            entryId: `${now.toISOString()}#${randomUUID().slice(0, 8)}`,
            action: 'grant',
            credits: -credits,
            source: 'bonus',
            detail: note.join(' ') || undefined,
            status: 'granted',
            createdAt: now.toISOString(),
            expiresAt: Math.floor(now.getTime() / 1000) + 400 * 86400,
          },
        }),
      )
      .catch((error) => console.warn(`Couldn't record it in ${LEDGER}: ${error.message}`));
    console.log(`Added ${credits} ${credits === 1 ? 'credit' : 'credits'}.`);
  } else if (command === 'plan') {
    if (!PLANS[value]) usage(`Plan must be one of ${Object.keys(PLANS).join(', ')}`);
    await doc.send(
      new UpdateCommand({
        TableName: USERS,
        Key: { userId },
        UpdateExpression: 'SET #plan = :p',
        ExpressionAttributeNames: { '#plan': 'plan' },
        ExpressionAttributeValues: { ':p': value },
      }),
    );
    console.log(`Plan set to ${value}.`);
  } else if (command !== 'show') usage(`Unknown command ${command}`);

  await show(userId);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
