/**
 * Monthly AI credits: every user gets `aiCreditsPerMonth` a month. An AI
 * image costs 1 and an AI video 5. Credits are taken when a request starts
 * and given back if it fails, so nobody pays for a result they didn't get.
 *
 * The count lives on the user's record: the month it's for, and how many
 * were used. A new month starts at zero.
 */

import { ConditionalCheckFailedException, DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';

export const AI_COSTS = { image: 1, video: 5 } as const;
export type AiKind = keyof typeof AI_COSTS;

export interface CreditBalance {
  used: number;
  limit: number;
  left: number;
  /** When the count goes back to zero (the first of next month, UTC) */
  resetsAt: string;
}

export class OutOfCreditsError extends Error {
  statusCode = 402;
  constructor(public balance: CreditBalance) {
    super(`No AI credits left this month. They reset on ${new Date(balance.resetsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}.`);
    this.name = 'OutOfCreditsError';
  }
}

export const monthOf = (d = new Date()) => d.toISOString().slice(0, 7);
const nextMonth = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();

export class AiCredits {
  private doc: DynamoDBDocumentClient;
  private table: string;

  constructor(doc?: DynamoDBDocumentClient) {
    const cfg = getConfig();
    const clientConfig: DynamoDBClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      clientConfig.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    this.doc = doc ?? DynamoDBDocumentClient.from(new DynamoDBClient(clientConfig));
    this.table = cfg.dynamoDbTableName;
  }

  private get limit() {
    return getConfig().aiCreditsPerMonth;
  }

  private balance(used: number): CreditBalance {
    return { used, limit: this.limit, left: Math.max(0, this.limit - used), resetsAt: nextMonth() };
  }

  async get(userId: string): Promise<CreditBalance> {
    const r = await this.doc.send(new GetCommand({ TableName: this.table, Key: { userId }, ProjectionExpression: 'aiCreditsMonth, aiCreditsUsed' }));
    const item = r.Item as { aiCreditsMonth?: string; aiCreditsUsed?: number } | undefined;
    return this.balance(item?.aiCreditsMonth === monthOf() ? item.aiCreditsUsed ?? 0 : 0);
  }

  /** Takes `cost` credits, or throws OutOfCreditsError if there aren't enough */
  async take(userId: string, cost: number): Promise<CreditBalance> {
    const month = monthOf();
    if (cost > this.limit) throw new OutOfCreditsError(await this.get(userId));
    try {
      // Same month: add, as long as it stays within the limit
      const r = await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { userId },
          UpdateExpression: 'ADD aiCreditsUsed :cost',
          ConditionExpression: 'attribute_exists(userId) AND aiCreditsMonth = :month AND aiCreditsUsed <= :max',
          ExpressionAttributeValues: { ':cost': cost, ':month': month, ':max': this.limit - cost },
          ReturnValues: 'ALL_NEW',
        })
      );
      return this.balance((r.Attributes?.aiCreditsUsed as number) ?? cost);
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) throw error;
    }
    try {
      // First use this month: start the count again
      await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { userId },
          UpdateExpression: 'SET aiCreditsMonth = :month, aiCreditsUsed = :cost',
          ConditionExpression: 'attribute_exists(userId) AND (attribute_not_exists(aiCreditsMonth) OR aiCreditsMonth <> :month)',
          ExpressionAttributeValues: { ':cost': cost, ':month': month },
        })
      );
      return this.balance(cost);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) throw new OutOfCreditsError(await this.get(userId));
      throw error;
    }
  }

  /** Gives credits back (a request failed); only within the month they were taken */
  async refund(userId: string, cost: number, takenMonth: string): Promise<void> {
    if (takenMonth !== monthOf()) return;
    try {
      await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { userId },
          UpdateExpression: 'ADD aiCreditsUsed :minus',
          ConditionExpression: 'aiCreditsMonth = :month AND aiCreditsUsed >= :cost',
          ExpressionAttributeValues: { ':minus': -cost, ':cost': cost, ':month': takenMonth },
        })
      );
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) throw error;
    }
  }
}
