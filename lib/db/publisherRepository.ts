/**
 * DynamoDB repository for publish log data access.
 *
 * Supports querying by user (UserIdIndex) and by post (PostIdIndex), plus
 * an access-control helper for verifying post ownership.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import { PublishLogRecord } from '../models/publisher';

export class PublisherRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;
  private scheduledPostsTableName: string;

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
    this.tableName = tableName || cfg.dynamoDbPublishLogTableName;
    this.scheduledPostsTableName = cfg.dynamoDbScheduledPostsTableName;
  }

  async createLog(record: PublishLogRecord): Promise<PublishLogRecord> {
    await this.docClient.send(new PutCommand({ TableName: this.tableName, Item: this.recordToItem(record) }));
    return record;
  }

  /** Query UserIdIndex for all logs belonging to a user, sorted by attemptedAt descending. */
  async listLogsByUser(userId: string): Promise<PublishLogRecord[]> {
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

  /** Query PostIdIndex for all publish attempts on a specific post. */
  async listLogsByPost(postId: string): Promise<PublishLogRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'PostIdIndex',
        KeyConditionExpression: 'postId = :postId',
        ExpressionAttributeValues: { ':postId': postId },
      })
    );
    return (result.Items || []).map((item) => this.itemToRecord(item));
  }

  /** Retrieve the userId for a post from the scheduled-posts table (for access control). */
  async getPostOwner(postId: string): Promise<string | null> {
    const result = await this.docClient.send(
      new GetCommand({ TableName: this.scheduledPostsTableName, Key: { postId } })
    );
    if (!result.Item) return null;
    return result.Item.userId ?? null;
  }

  private recordToItem(record: PublishLogRecord): Record<string, any> {
    const item: Record<string, any> = {
      logId: record.log_id,
      postId: record.post_id,
      userId: record.user_id,
      platform: record.platform,
      status: record.status,
      attemptedAt: record.attempted_at,
    };
    if (record.linkedin_post_id != null) item.linkedinPostId = record.linkedin_post_id;
    if (record.error_code != null) item.errorCode = record.error_code;
    if (record.error_message != null) item.errorMessage = record.error_message;
    return item;
  }

  private itemToRecord(item: Record<string, any>): PublishLogRecord {
    return {
      log_id: item.logId,
      post_id: item.postId,
      user_id: item.userId,
      platform: item.platform || 'linkedin',
      status: item.status,
      linkedin_post_id: item.linkedinPostId ?? null,
      error_code: item.errorCode ?? null,
      error_message: item.errorMessage ?? null,
      attempted_at: item.attemptedAt,
    };
  }
}
