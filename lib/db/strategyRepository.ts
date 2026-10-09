/**
 * DynamoDB repository for strategy data access.
 *
 * Handles storing and retrieving strategy records with user isolation.
 */

import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import { ChannelDescription, QuizAnswers, StrategyOutput, StrategyRecord } from '../models/strategy';
import type { CopyChatMessage, CopyJob } from '../models/copy';

/** Chat messages kept per strategy; older ones are dropped */
export const MAX_COPY_CHAT_MESSAGES = 100;

/** A strategy as stored in DynamoDB (camelCase attribute names) */
interface StrategyItem {
  strategyId: string;
  userId: string;
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
  strategyOutput: StrategyOutput;
  quiz?: QuizAnswers;
  createdAt: string;
}

export class StrategyRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName?: string, region?: string) {
    const cfg = getConfig();
    const clientConfig: DynamoDBClientConfig = { region: region || cfg.awsRegion };
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
    return this.itemToRecord(result.Item as StrategyItem);
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

  /** The Copywriter workspace state stored on a strategy: its latest generation job and chat */
  async getCopyWorkspace(strategyId: string): Promise<{ job: CopyJob | null; chat: CopyChatMessage[] }> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { strategyId },
        ProjectionExpression: 'copyJob, copyChat',
      })
    );
    return { job: (result.Item?.copyJob as CopyJob) ?? null, chat: (result.Item?.copyChat as CopyChatMessage[]) ?? [] };
  }

  /**
   * Start a generation job unless one is already running and still alive.
   * Returns false if another job got there first.
   */
  async startCopyJob(strategyId: string, job: CopyJob, staleBefore: string): Promise<boolean> {
    try {
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { strategyId },
          UpdateExpression: 'SET copyJob = :job',
          ConditionExpression:
            'attribute_exists(strategyId) AND (attribute_not_exists(copyJob) OR copyJob.#status <> :running OR copyJob.updated_at < :staleBefore)',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':job': job, ':running': 'running', ':staleBefore': staleBefore },
        })
      );
      return true;
    } catch (error) {
      if ((error as { name?: string }).name === 'ConditionalCheckFailedException') return false;
      throw error;
    }
  }

  /** Update fields of the current job; ignored if a newer job has replaced it */
  async updateCopyJob(strategyId: string, jobId: string, fields: Partial<CopyJob>): Promise<void> {
    const names: Record<string, string> = { '#id': 'id' };
    const values: Record<string, unknown> = { ':jobId': jobId };
    const sets = Object.entries(fields).map(([key, value], i) => {
      names[`#f${i}`] = key;
      values[`:v${i}`] = value;
      return `copyJob.#f${i} = :v${i}`;
    });
    if (sets.length === 0) return;
    try {
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { strategyId },
          UpdateExpression: `SET ${sets.join(', ')}`,
          ConditionExpression: 'copyJob.#id = :jobId',
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        })
      );
    } catch (error) {
      if ((error as { name?: string }).name !== 'ConditionalCheckFailedException') throw error;
    }
  }

  /** Append messages to a strategy's Copywriter chat, keeping the newest MAX_COPY_CHAT_MESSAGES */
  async appendCopyChat(strategyId: string, messages: CopyChatMessage[]): Promise<void> {
    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { strategyId },
        UpdateExpression: 'SET copyChat = list_append(if_not_exists(copyChat, :empty), :messages)',
        ConditionExpression: 'attribute_exists(strategyId)',
        ExpressionAttributeValues: { ':empty': [], ':messages': messages },
        ReturnValues: 'UPDATED_NEW',
      })
    );
    const chat = (result.Attributes?.copyChat as CopyChatMessage[]) ?? [];
    if (chat.length > MAX_COPY_CHAT_MESSAGES) {
      // Trim in a separate write; a message appended in between is kept by the next trim
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { strategyId },
          UpdateExpression: `REMOVE ${Array.from({ length: chat.length - MAX_COPY_CHAT_MESSAGES }, (_, i) => `copyChat[${i}]`).join(', ')}`,
        })
      );
    }
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
    return (result.Items || []).map((item) => this.itemToRecord(item as StrategyItem));
  }

  private recordToItem(record: StrategyRecord): StrategyItem {
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

  private itemToRecord(item: StrategyItem): StrategyRecord {
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
