/**
 * DynamoDB repository for designs made in the Designer
 */

import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import type { DesignRecord } from '../design/types';

export class DesignRepository {
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
    this.tableName = cfg.dynamoDbDesignsTableName;
  }

  async put(record: DesignRecord): Promise<DesignRecord> {
    await this.docClient.send(new PutCommand({ TableName: this.tableName, Item: record }));
    return record;
  }

  /** The design, or null if it doesn't exist or belongs to someone else */
  async get(designId: string, userId: string): Promise<DesignRecord | null> {
    const result = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { designId } }));
    const item = result.Item as DesignRecord | undefined;
    return item && item.userId === userId ? item : null;
  }

  /** A user's designs, most recently edited first (up to `max`) */
  async listByUser(userId: string, max = 200): Promise<DesignRecord[]> {
    const items: DesignRecord[] = [];
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
      items.push(...((result.Items as DesignRecord[]) ?? []));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey && items.length < max);
    return items.slice(0, max);
  }

  async delete(designId: string): Promise<void> {
    await this.docClient.send(new DeleteCommand({ TableName: this.tableName, Key: { designId } }));
  }
}
