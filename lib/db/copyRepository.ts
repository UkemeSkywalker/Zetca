/**
 * DynamoDB repository for copy data access.
 *
 * Handles storing and retrieving copy records with user isolation and
 * strategy-based querying.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import { CopyRecord } from '../models/copy';

export class CopyRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName?: string, region?: string) {
    const cfg = getConfig();
    const clientConfig: Record<string, any> = { region: region || cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: cfg.awsAccessKeyId,
        secretAccessKey: cfg.awsSecretAccessKey,
      };
    }
    const client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = tableName || cfg.dynamoDbCopiesTableName;
  }

  async createCopy(record: CopyRecord): Promise<CopyRecord> {
    await this.docClient.send(new PutCommand({ TableName: this.tableName, Item: this.recordToItem(record) }));
    return record;
  }

  /** Batch store multiple copy records (chunked into groups of 25 per DynamoDB limits). */
  async createCopies(records: CopyRecord[]): Promise<CopyRecord[]> {
    const chunkSize = 25;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await this.docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((r) => ({ PutRequest: { Item: this.recordToItem(r) } })),
          },
        })
      );
    }
    return records;
  }

  async getCopyById(copyId: string, userId?: string): Promise<CopyRecord | null> {
    const result = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { copyId } }));
    if (!result.Item) return null;
    if (userId !== undefined && result.Item.userId !== userId) return null;
    return this.itemToRecord(result.Item);
  }

  async copyExists(copyId: string): Promise<boolean> {
    const result = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { copyId } }));
    return !!result.Item;
  }

  async listCopiesByStrategy(strategyId: string): Promise<CopyRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StrategyIdIndex',
        KeyConditionExpression: 'strategyId = :strategyId',
        ExpressionAttributeValues: { ':strategyId': strategyId },
        ScanIndexForward: false,
      })
    );
    return (result.Items || []).map((item) => this.itemToRecord(item));
  }

  async listCopiesByUser(userId: string): Promise<CopyRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ScanIndexForward: false,
      })
    );
    return (result.Items || []).map((item) => this.itemToRecord(item));
  }

  async updateCopy(copyId: string, text: string, hashtags: string[]): Promise<CopyRecord> {
    const now = new Date().toISOString();
    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { copyId },
        UpdateExpression: 'SET #txt = :text, hashtags = :hashtags, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#txt': 'text' },
        ExpressionAttributeValues: { ':text': text, ':hashtags': hashtags, ':updatedAt': now },
        ReturnValues: 'ALL_NEW',
      })
    );
    return this.itemToRecord(result.Attributes!);
  }

  /** Returns true if deleted. */
  async deleteCopy(copyId: string): Promise<boolean> {
    const result = await this.docClient.send(
      new DeleteCommand({ TableName: this.tableName, Key: { copyId }, ReturnValues: 'ALL_OLD' })
    );
    return !!result.Attributes;
  }

  private recordToItem(record: CopyRecord): Record<string, any> {
    return {
      copyId: record.id,
      strategyId: record.strategy_id,
      userId: record.user_id,
      text: record.text,
      platform: record.platform,
      hashtags: record.hashtags,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private itemToRecord(item: Record<string, any>): CopyRecord {
    return {
      id: item.copyId,
      strategy_id: item.strategyId,
      user_id: item.userId,
      text: item.text,
      platform: item.platform,
      hashtags: item.hashtags || [],
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}
