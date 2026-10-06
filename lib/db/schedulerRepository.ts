/**
 * DynamoDB repository for scheduled post data access.
 *
 * Handles user isolation, strategy-based querying, and full CRUD
 * operations on scheduled posts.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import { ScheduledPostRecord } from '../models/scheduler';

// Maps our snake_case update field names to DynamoDB attribute names.
const FIELD_MAPPING: Record<string, string> = {
  scheduled_date: 'scheduledDate',
  scheduled_time: 'scheduledTime',
  content: 'content',
  platform: 'platform',
  hashtags: 'hashtags',
  status: 'status',
  media_id: 'mediaId',
  media_type: 'mediaType',
};
const NULLABLE_FIELDS = new Set(['media_id', 'media_type']);

export class SchedulerRepository {
  public tableName: string;
  private docClient: DynamoDBDocumentClient;

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
    this.tableName = tableName || cfg.dynamoDbScheduledPostsTableName;
  }

  async createPost(record: ScheduledPostRecord): Promise<ScheduledPostRecord> {
    await this.docClient.send(new PutCommand({ TableName: this.tableName, Item: this.recordToItem(record) }));
    return record;
  }

  async createPosts(records: ScheduledPostRecord[]): Promise<ScheduledPostRecord[]> {
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

  async getPostById(postId: string, userId?: string): Promise<ScheduledPostRecord | null> {
    const result = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { postId } }));
    if (!result.Item) return null;
    if (userId !== undefined && result.Item.userId !== userId) return null;
    return this.itemToRecord(result.Item);
  }

  async postExists(postId: string): Promise<boolean> {
    const result = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { postId } }));
    return !!result.Item;
  }

  /** List all posts for a user via UserIdIndex, sorted by scheduledDate ascending. */
  async listPostsByUser(userId: string): Promise<ScheduledPostRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ScanIndexForward: true,
      })
    );
    return (result.Items || []).map((item) => this.itemToRecord(item));
  }

  async listPostsByStrategy(strategyId: string): Promise<ScheduledPostRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StrategyIdIndex',
        KeyConditionExpression: 'strategyId = :strategyId',
        ExpressionAttributeValues: { ':strategyId': strategyId },
        ScanIndexForward: true,
      })
    );
    return (result.Items || []).map((item) => this.itemToRecord(item));
  }

  /** Update post fields and set updatedAt. `updates` uses snake_case keys; null removes nullable attrs. */
  async updatePost(postId: string, updates: Record<string, any>): Promise<ScheduledPostRecord> {
    const now = new Date().toISOString();
    const setParts: string[] = [];
    const removeParts: string[] = [];
    const attrNames: Record<string, string> = {};
    const attrValues: Record<string, any> = { ':updatedAt': now };

    for (const [field, dbField] of Object.entries(FIELD_MAPPING)) {
      if (!(field in updates)) continue;
      const value = updates[field];
      if (value === null && NULLABLE_FIELDS.has(field)) {
        const namePlaceholder = `#${field}`;
        removeParts.push(namePlaceholder);
        attrNames[namePlaceholder] = dbField;
      } else if (value !== null && value !== undefined) {
        const namePlaceholder = `#${field}`;
        const valuePlaceholder = `:${field}`;
        setParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
        attrNames[namePlaceholder] = dbField;
        attrValues[valuePlaceholder] = value;
      }
    }

    setParts.push('#updatedAt = :updatedAt');
    attrNames['#updatedAt'] = 'updatedAt';

    let updateExpr = `SET ${setParts.join(', ')}`;
    if (removeParts.length) {
      updateExpr += ` REMOVE ${removeParts.join(', ')}`;
    }

    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { postId },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: attrNames,
        ExpressionAttributeValues: attrValues,
        ReturnValues: 'ALL_NEW',
      })
    );
    return this.itemToRecord(result.Attributes!);
  }

  /** Delete all posts for a user. Returns the number of deleted records. */
  async deleteAllByUser(userId: string): Promise<number> {
    const posts = await this.listPostsByUser(userId);
    const chunkSize = 25;
    for (let i = 0; i < posts.length; i += chunkSize) {
      const chunk = posts.slice(i, i + chunkSize);
      await this.docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((p) => ({ DeleteRequest: { Key: { postId: p.id } } })),
          },
        })
      );
    }
    return posts.length;
  }

  /** Returns true if deleted. */
  async deletePost(postId: string): Promise<boolean> {
    const result = await this.docClient.send(
      new DeleteCommand({ TableName: this.tableName, Key: { postId }, ReturnValues: 'ALL_OLD' })
    );
    return !!result.Attributes;
  }

  /** Scan the entire table (used by the publish scanner to find due posts across all users). */
  async scanAll(): Promise<ScheduledPostRecord[]> {
    const items: Record<string, any>[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;
    do {
      const result = await this.docClient.send(
        new ScanCommand({ TableName: this.tableName, ExclusiveStartKey: lastEvaluatedKey })
      );
      items.push(...(result.Items || []));
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return items.map((item) => this.itemToRecord(item));
  }

  private recordToItem(record: ScheduledPostRecord): Record<string, any> {
    const item: Record<string, any> = {
      postId: record.id,
      strategyId: record.strategy_id,
      copyId: record.copy_id,
      userId: record.user_id,
      content: record.content,
      platform: record.platform,
      hashtags: record.hashtags,
      scheduledDate: record.scheduled_date,
      scheduledTime: record.scheduled_time,
      status: record.status,
      strategyColor: record.strategy_color,
      strategyLabel: record.strategy_label,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
    if (record.media_id != null) item.mediaId = record.media_id;
    if (record.media_type != null) item.mediaType = record.media_type;
    return item;
  }

  private itemToRecord(item: Record<string, any>): ScheduledPostRecord {
    return {
      id: item.postId,
      strategy_id: item.strategyId,
      copy_id: item.copyId,
      user_id: item.userId,
      content: item.content,
      platform: item.platform,
      hashtags: item.hashtags || [],
      scheduled_date: item.scheduledDate,
      scheduled_time: item.scheduledTime,
      status: item.status,
      strategy_color: item.strategyColor || '',
      strategy_label: item.strategyLabel || '',
      media_id: item.mediaId ?? null,
      media_type: item.mediaType ?? null,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}
