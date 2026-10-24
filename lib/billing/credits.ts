/**
 * Each user's credit balance: the plan's monthly credits (counted on the
 * user's record and reset each calendar month, UTC) plus top-up credits, which
 * are spent once the month's run out.
 *
 * Credits are taken when an action starts and given back if it fails, so
 * nobody pays for something they didn't get.
 */

import { ConditionalCheckFailedException, DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import { ApiError } from '../errors';
import { planOf, type PlanId } from './plans';
import { FREE_AI } from './aiModels';

export interface CreditBalance {
  plan: PlanId;
  /** This month's plan credits */
  monthly: { used: number; limit: number; left: number };
  /** Top-up credits */
  bonus: number;
  /** Everything that can be spent now */
  left: number;
  /** When the monthly count goes back to zero */
  resetsAt: string;
  /** AI images and videos are on this plan */
  aiMedia: boolean;
  /** Free AI images and videos left (everyone's one-off allowance, on the default models) */
  freeAi: { image: number; video: number };
}

export type FreeAiKind = 'image' | 'video';
const FREE_FIELD: Record<FreeAiKind, string> = { image: 'freeImagesUsed', video: 'freeVideosUsed' };

/** Where a charge came from, so a refund goes back to the same place ('free': one of the free AI uses) */
export type CreditSource = 'monthly' | 'bonus' | 'free';

export class OutOfCreditsError extends ApiError {
  constructor(public balance: CreditBalance, public needed: number) {
    super(
      `This needs ${needed} ${needed === 1 ? 'credit' : 'credits'} and you have ${balance.left} left. ` +
        `Credits reset on ${resetDate(balance.resetsAt)}, or add more on the Billing page.`,
      402
    );
    this.name = 'OutOfCreditsError';
  }
}

export class PlanRequiredError extends ApiError {
  constructor(what: string, planName: string) {
    super(`${what} ${planName === 'Starter' ? 'are on paid plans' : `need the ${planName} plan`}. See the Billing page to upgrade.`, 403);
    this.name = 'PlanRequiredError';
  }
}

export const monthOf = (d = new Date()) => d.toISOString().slice(0, 7);
const nextMonth = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
export const resetDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

interface CreditFields {
  plan?: string;
  creditsMonth?: string;
  creditsUsed?: number;
  creditsBonus?: number;
  freeImagesUsed?: number;
  freeVideosUsed?: number;
}

export class Credits {
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

  private async fields(userId: string): Promise<CreditFields> {
    const r = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { userId }, ProjectionExpression: '#plan, creditsMonth, creditsUsed, creditsBonus, freeImagesUsed, freeVideosUsed', ExpressionAttributeNames: { '#plan': 'plan' } })
    );
    return (r.Item as CreditFields) ?? {};
  }

  private balanceOf(f: CreditFields): CreditBalance {
    const plan = planOf(f.plan);
    const used = f.creditsMonth === monthOf() ? f.creditsUsed ?? 0 : 0;
    const left = Math.max(0, plan.monthlyCredits - used);
    const bonus = Math.max(0, f.creditsBonus ?? 0);
    return {
      plan: plan.id,
      monthly: { used, limit: plan.monthlyCredits, left },
      bonus,
      left: left + bonus,
      resetsAt: nextMonth(),
      aiMedia: plan.aiMedia,
      freeAi: {
        image: Math.max(0, FREE_AI.image - (f.freeImagesUsed ?? 0)),
        video: Math.max(0, FREE_AI.video - (f.freeVideosUsed ?? 0)),
      },
    };
  }

  async get(userId: string): Promise<CreditBalance> {
    return this.balanceOf(await this.fields(userId));
  }

  /**
   * Takes `cost` credits: from this month's credits when they cover it, else
   * from top-up credits. Throws OutOfCreditsError when neither does.
   */
  async take(userId: string, cost: number): Promise<{ source: CreditSource; month: string; balance: CreditBalance }> {
    const f = await this.fields(userId);
    const plan = planOf(f.plan);
    const month = monthOf();
    const limit = plan.monthlyCredits;

    if (cost <= limit) {
      try {
        // Same month: add, as long as it stays within the plan
        await this.doc.send(
          new UpdateCommand({
            TableName: this.table,
            Key: { userId },
            UpdateExpression: 'ADD creditsUsed :cost',
            ConditionExpression: 'attribute_exists(userId) AND creditsMonth = :month AND creditsUsed <= :max',
            ExpressionAttributeValues: { ':cost': cost, ':month': month, ':max': limit - cost },
          })
        );
        return { source: 'monthly', month, balance: await this.get(userId) };
      } catch (error) {
        if (!(error instanceof ConditionalCheckFailedException)) throw error;
      }
      try {
        // First use this month: the count starts again
        await this.doc.send(
          new UpdateCommand({
            TableName: this.table,
            Key: { userId },
            UpdateExpression: 'SET creditsMonth = :month, creditsUsed = :cost',
            ConditionExpression: 'attribute_exists(userId) AND (attribute_not_exists(creditsMonth) OR creditsMonth <> :month)',
            ExpressionAttributeValues: { ':cost': cost, ':month': month },
          })
        );
        return { source: 'monthly', month, balance: await this.get(userId) };
      } catch (error) {
        if (!(error instanceof ConditionalCheckFailedException)) throw error;
      }
    }
    try {
      // The month's credits don't cover it: top-up credits
      await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { userId },
          UpdateExpression: 'ADD creditsBonus :minus',
          ConditionExpression: 'attribute_exists(userId) AND creditsBonus >= :cost',
          ExpressionAttributeValues: { ':minus': -cost, ':cost': cost },
        })
      );
      return { source: 'bonus', month, balance: await this.get(userId) };
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) throw new OutOfCreditsError(await this.get(userId), cost);
      throw error;
    }
  }

  /** Gives credits back to where they came from (monthly ones only within their month) */
  async refund(userId: string, cost: number, source: CreditSource, month: string): Promise<void> {
    if (cost <= 0 || source === 'free') return;
    try {
      if (source === 'bonus') {
        await this.doc.send(
          new UpdateCommand({ TableName: this.table, Key: { userId }, UpdateExpression: 'ADD creditsBonus :cost', ExpressionAttributeValues: { ':cost': cost } })
        );
        return;
      }
      if (month !== monthOf()) return;
      await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { userId },
          UpdateExpression: 'ADD creditsUsed :minus',
          ConditionExpression: 'creditsMonth = :month AND creditsUsed >= :cost',
          ExpressionAttributeValues: { ':minus': -cost, ':cost': cost, ':month': month },
        })
      );
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) throw error;
    }
  }

  /** Uses one of the user's free AI images or videos; false when none are left */
  async takeFree(userId: string, kind: FreeAiKind): Promise<boolean> {
    const field = FREE_FIELD[kind];
    try {
      await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { userId },
          UpdateExpression: `ADD ${field} :one`,
          ConditionExpression: `attribute_exists(userId) AND (attribute_not_exists(${field}) OR ${field} < :max)`,
          ExpressionAttributeValues: { ':one': 1, ':max': FREE_AI[kind] },
        })
      );
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return false;
      throw error;
    }
  }

  /** Gives a free AI use back (the AI couldn't make it) */
  async refundFree(userId: string, kind: FreeAiKind): Promise<void> {
    const field = FREE_FIELD[kind];
    try {
      await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { userId },
          UpdateExpression: `ADD ${field} :minus`,
          ConditionExpression: `${field} > :zero`,
          ExpressionAttributeValues: { ':minus': -1, ':zero': 0 },
        })
      );
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) throw error;
    }
  }

  /** Adds top-up credits (a pack bought, or credits given by the Zetca team) */
  async grant(userId: string, credits: number): Promise<CreditBalance> {
    await this.doc.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { userId },
        UpdateExpression: 'ADD creditsBonus :n',
        ConditionExpression: 'attribute_exists(userId)',
        ExpressionAttributeValues: { ':n': credits },
      })
    );
    return this.get(userId);
  }

  async setPlan(userId: string, plan: PlanId): Promise<CreditBalance> {
    await this.doc.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { userId },
        UpdateExpression: 'SET #plan = :plan',
        ConditionExpression: 'attribute_exists(userId)',
        ExpressionAttributeNames: { '#plan': 'plan' },
        ExpressionAttributeValues: { ':plan': plan },
      })
    );
    return this.get(userId);
  }
}
