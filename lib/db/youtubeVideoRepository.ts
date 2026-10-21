/**
 * DynamoDB repository for YouTube videos scheduled from Zetca
 */

import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { getConfig } from '../config';
import type { YouTubeVideoRecord, YouTubeVideoStatus } from '../models/youtubeVideo';

export class YouTubeVideoRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const cfg = getConfig();
    const clientConfig: DynamoDBClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      clientConfig.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient(clientConfig), {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.tableName = cfg.dynamoDbYouTubeVideosTableName;
  }

  async create(record: YouTubeVideoRecord): Promise<YouTubeVideoRecord> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: record,
        ConditionExpression: 'attribute_not_exists(videoId)',
      })
    );
    return record;
  }

  async getById(videoId: string): Promise<YouTubeVideoRecord | null> {
    const result = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { videoId } }));
    return (result.Item as YouTubeVideoRecord) ?? null;
  }

  /** Whether a video already uses this upload (one YouTube video per upload) */
  async findByMedia(userId: string, mediaId: string): Promise<YouTubeVideoRecord | null> {
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'UserIdIndex',
          KeyConditionExpression: 'userId = :userId',
          FilterExpression: 'mediaId = :mediaId',
          ExpressionAttributeValues: { ':userId': userId, ':mediaId': mediaId },
          ExclusiveStartKey: lastKey,
        })
      );
      const match = result.Items?.[0];
      if (match) return match as YouTubeVideoRecord;
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return null;
  }

  /** Videos with a status, oldest first (StatusIndex) */
  async listByStatus(status: YouTubeVideoStatus, limit = 25): Promise<YouTubeVideoRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
        Limit: limit,
      })
    );
    return (result.Items as YouTubeVideoRecord[]) ?? [];
  }

  /**
   * Claims a video for upload. Succeeds only if it's waiting and due, or if a
   * worker stopped sending heartbeats (crashed) before `staleBefore`. Returns
   * the claimed record, or null if another worker got it first.
   */
  async claim(videoId: string, now: Date, staleBefore: Date): Promise<YouTubeVideoRecord | null> {
    const at = now.toISOString();
    try {
      const result = await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { videoId },
          UpdateExpression:
            'SET #status = :uploading, heartbeatAt = :now, updatedAt = :now, attempts = if_not_exists(attempts, :zero) + :one REMOVE nextAttemptAt',
          ConditionExpression:
            '(#status IN (:queued, :waiting) AND (attribute_not_exists(nextAttemptAt) OR nextAttemptAt <= :now)) OR ' +
            '(#status = :uploading AND heartbeatAt < :stale)',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':uploading': 'uploading',
            ':queued': 'queued',
            ':waiting': 'waiting_quota',
            ':now': at,
            ':stale': staleBefore.toISOString(),
            ':zero': 0,
            ':one': 1,
          },
          ReturnValues: 'ALL_NEW',
        })
      );
      return result.Attributes as YouTubeVideoRecord;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return null;
      throw error;
    }
  }

  /**
   * Sets fields (and removes others). With `onlyIfStatus`, the write happens
   * only while the video still has that status; returns false otherwise.
   */
  async update(
    videoId: string,
    set: Partial<YouTubeVideoRecord>,
    { remove = [], onlyIfStatus }: { remove?: (keyof YouTubeVideoRecord)[]; onlyIfStatus?: YouTubeVideoStatus } = {}
  ): Promise<boolean> {
    const fields = { ...set, updatedAt: new Date().toISOString() };
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const sets: string[] = [];
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      names[`#${key}`] = key;
      values[`:${key}`] = value;
      sets.push(`#${key} = :${key}`);
    }
    const removes = remove.map((key) => {
      names[`#${String(key)}`] = String(key);
      return `#${String(key)}`;
    });
    if (onlyIfStatus) {
      names['#status'] = 'status';
      values[':expectedStatus'] = onlyIfStatus;
    }
    try {
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { videoId },
          UpdateExpression: `SET ${sets.join(', ')}${removes.length ? ` REMOVE ${removes.join(', ')}` : ''}`,
          ...(onlyIfStatus ? { ConditionExpression: '#status = :expectedStatus' } : {}),
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        })
      );
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return false;
      throw error;
    }
  }

  /** A user's videos, newest first (up to `max`) */
  async listByUser(userId: string, max = 200): Promise<YouTubeVideoRecord[]> {
    const items: YouTubeVideoRecord[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'UserIdIndex',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId },
          ScanIndexForward: false,
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...((result.Items as YouTubeVideoRecord[]) ?? []));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey && items.length < max);
    return items.slice(0, max);
  }
}
