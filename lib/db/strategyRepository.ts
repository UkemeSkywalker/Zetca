/**
 * DynamoDB repository for strategy data access.
 *
 * Handles storing and retrieving strategy records with user isolation.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import { ChannelDescription, StrategyRecord } from '../models/strategy';

export class StrategyRepository {
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
    this.tableName = tableName || cfg.dynamoDbStrategiesTableName;
  }

  async createStrategy(record: StrategyRecord): Promise<StrategyRecord> {
    await this.docClient.send(
      new PutCommand({ TableName: this.tableName, Item: this.recordToItem(record) })
    );
    return record;
  }

  /** Retrieve a strategy by ID with optional user isolation enforcement. */
  async getStrategyById(strategyId: string, userId?: string): Promise<StrategyRecord | null> {
    const result = await this.docClient.send(
      new GetCommand({ TableName: this.tableName, Key: { strategyId } })
    );
    if (!result.Item) return null;
    if (userId !== undefined && result.Item.userId !== userId) return null;
    return this.itemToRecord(result.Item);
  }

  /** Replace a strategy's channel descriptions; only succeeds for the strategy's owner. */
  async updateChannelDescriptions(strategyId: string, userId: string, descriptions: ChannelDescription[]): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { strategyId },
        UpdateExpression: 'SET strategyOutput.channel_descriptions = :descriptions',
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':descriptions': descriptions, ':userId': userId },
      })
    );
  }

  /** Delete a strategy; only succeeds for the strategy's owner (throws ConditionalCheckFailedException otherwise). */
  async deleteStrategy(strategyId: string, userId: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { strategyId },
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
      })
    );
  }

  /** Check if a strategy exists regardless of owner. */
  async strategyExists(strategyId: string): Promise<boolean> {
    const result = await this.docClient.send(
      new GetCommand({ TableName: this.tableName, Key: { strategyId } })
    );
    return !!result.Item;
  }

  /** List all strategies for a user, sorted by createdAt descending. */
  async listStrategiesByUser(userId: string): Promise<StrategyRecord[]> {
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

  private recordToItem(record: StrategyRecord): Record<string, any> {
    return {
      strategyId: record.id,
      userId: record.user_id,
      brandName: record.brand_name,
      industry: record.industry,
      targetAudience: record.target_audience,
      goals: record.goals,
      strategyOutput: record.strategy_output,
      ...(record.quiz ? { quiz: record.quiz } : {}),
      createdAt: record.created_at,
    };
  }

  private itemToRecord(item: Record<string, any>): StrategyRecord {
    return {
      id: item.strategyId,
      user_id: item.userId,
      brand_name: item.brandName,
      industry: item.industry,
      target_audience: item.targetAudience,
      goals: item.goals,
      strategy_output: item.strategyOutput,
      ...(item.quiz ? { quiz: item.quiz } : {}),
      created_at: item.createdAt,
    };
  }
}
