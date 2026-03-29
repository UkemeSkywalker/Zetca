/**
 * DynamoDB Media Repository
 * Handles all database operations for media metadata
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
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
    const clientConfig: Record<string, any> = {
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
