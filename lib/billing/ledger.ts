/**
 * The credit ledger: one entry per charge, refund or grant, with the real
 * tokens and cost behind it. Users see it as their usage history; Zetca uses
 * it to check each action's price against its real cost.
 */

import { randomUUID } from 'crypto';
import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import type { ActionId } from './prices';
import type { CreditSource } from './credits';

export interface LedgerEntry {
  userId: string;
  /** Sorts newest last: ISO time + a random suffix */
  entryId: string;
  action: ActionId;
  /** Credits taken (negative for a refund or grant: credits given) */
  credits: number;
  source?: CreditSource;
  /** What it was for, e.g. the model or "instagram" */
  detail?: string;
  /** The AI's real use, when known */
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  status: 'charged' | 'refunded' | 'granted';
  createdAt: string;
  expiresAt: number;
}

const KEEP_DAYS = 400;

export class Ledger {
  private doc: DynamoDBDocumentClient;
  private table: string;

  constructor(doc?: DynamoDBDocumentClient) {
    const cfg = getConfig();
    const clientConfig: DynamoDBClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      clientConfig.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    this.doc = doc ?? DynamoDBDocumentClient.from(new DynamoDBClient(clientConfig), { marshallOptions: { removeUndefinedValues: true } });
    this.table = cfg.dynamoDbCreditLedgerTableName;
  }

  async add(entry: Omit<LedgerEntry, 'entryId' | 'createdAt' | 'expiresAt'>): Promise<LedgerEntry> {
    const now = new Date();
    const full: LedgerEntry = {
      ...entry,
      entryId: `${now.toISOString()}#${randomUUID().slice(0, 8)}`,
      createdAt: now.toISOString(),
      expiresAt: Math.floor(now.getTime() / 1000) + KEEP_DAYS * 86400,
    };
    await this.doc.send(new PutCommand({ TableName: this.table, Item: full }));
    return full;
  }

  /** A user's latest entries, newest first */
  async recent(userId: string, limit = 50): Promise<LedgerEntry[]> {
    const r = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
        ScanIndexForward: false,
        Limit: limit,
      })
    );
    return (r.Items as LedgerEntry[]) ?? [];
  }
}
