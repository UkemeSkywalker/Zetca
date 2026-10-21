/**
 * DynamoDB repository for YouTube videos scheduled from Zetca
 */

import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import type { YouTubeVideoRecord } from '../models/youtubeVideo';

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
}
