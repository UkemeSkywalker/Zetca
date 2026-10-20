/**
 * DynamoDB Media Repository
 * Handles all database operations for media metadata
 */

import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import { MediaRecord } from '../../types/media';

/**
 * MediaRepository class for managing media metadata in DynamoDB
 */
export class MediaRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const cfg = getConfig();
    const clientConfig: DynamoDBClientConfig = {
      region: cfg.awsRegion,
    };

    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: cfg.awsAccessKeyId,
        secretAccessKey: cfg.awsSecretAccessKey,
      };
    }

    const client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = cfg.dynamoDbMediaTableName;
  }

  /**
   * Create a new media record in DynamoDB
   */
  async createMedia(record: MediaRecord): Promise<MediaRecord> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: record,
        ConditionExpression: 'attribute_not_exists(mediaId)',
      })
    );

    return record;
  }

  /**
   * Get media record by mediaId (primary key lookup)
   */
  async getMediaById(mediaId: string): Promise<MediaRecord | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { mediaId },
      })
    );

    return (result.Item as MediaRecord) || null;
  }

  /**
   * Get all media records for a user via the UserIdIndex GSI
   */
  async getMediaByUser(userId: string): Promise<MediaRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    return (result.Items as MediaRecord[]) || [];
  }

  /**
   * Mark a multipart video upload as finished. Only an 'uploading' record
   * changes, so a repeated or late complete call can't overwrite it.
   */
  async markVideoUploaded(
    mediaId: string,
    details: { fileSize: number; durationSeconds?: number; width?: number; height?: number }
  ): Promise<void> {
    const names: Record<string, string> = { '#status': 'status' };
    const values: Record<string, unknown> = {
      ':ready': 'ready',
      ':uploading': 'uploading',
      ':fileSize': details.fileSize,
    };
    const sets = ['#status = :ready', 'fileSize = :fileSize'];
    for (const key of ['durationSeconds', 'width', 'height'] as const) {
      if (details[key] !== undefined) {
        sets.push(`${key} = :${key}`);
        values[`:${key}`] = details[key];
      }
    }
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { mediaId },
        UpdateExpression: `SET ${sets.join(', ')} REMOVE uploadId`,
        ConditionExpression: '#status = :uploading',
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
  }

  /**
   * Delete a media record from DynamoDB
   */
  async deleteMedia(mediaId: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { mediaId },
      })
    );
  }
}
