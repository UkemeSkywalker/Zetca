/**
 * DynamoDB repository for scheduled post data access.
 *
 * Handles user isolation, strategy-based querying, full CRUD, and the
 * publisher's claim/finish steps. Status changes the publisher makes are
 * conditional writes, so two publishers (two servers, or a manual publish
 * racing the scanner) can never both post the same scheduled post.
 */

import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  BatchWriteCommand,
  type BatchWriteCommandInput,
  type BatchWriteCommandOutput,
  type QueryCommandInput,
  type QueryCommandOutput,
  type ScanCommandInput,
  type ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import { PostStatus, ScheduledPostRecord, dueAtOf } from '../models/scheduler';

/** Index on (status, dueAt), so the publisher can query due posts instead of scanning the table */
export const DUE_INDEX = 'StatusDueIndex';

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
  due_at: 'dueAt',
  publish_attempts: 'publishAttempts',
  next_attempt_at: 'nextAttemptAt',
  claimed_at: 'claimedAt',
  published_at: 'publishedAt',
  last_error_code: 'lastErrorCode',
  last_error: 'lastError',
};

/** Fields that are removed from the item when set to null */
const NULLABLE_FIELDS = new Set([
  'media_id',
  'media_type',
  'next_attempt_at',
  'claimed_at',
  'published_at',
  'last_error_code',
  'last_error',
]);

export type PostUpdates = { [K in keyof ScheduledPostRecord]?: ScheduledPostRecord[K] | null };

/** A scheduled post as stored in DynamoDB (camelCase attribute names) */
interface PostItem {
  postId: string;
  strategyId: string;
  copyId: string;
  userId: string;
  content: string;
  platform: string;
  hashtags?: string[];
  scheduledDate: string;
  scheduledTime: string;
  status: PostStatus;
  strategyColor?: string;
  strategyLabel?: string;
  mediaId?: string;
  mediaType?: string;
  dueAt?: string;
  publishAttempts?: number;
  nextAttemptAt?: string;
  claimedAt?: string;
  publishedAt?: string;
  lastErrorCode?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

type WriteRequests = NonNullable<BatchWriteCommandInput['RequestItems']>[string];

function isConditionFailure(error: unknown): boolean {
  return (error as { name?: string }).name === 'ConditionalCheckFailedException';
}

export class SchedulerRepository {
  public tableName: string;
  private docClient: DynamoDBDocumentClient;
  /** Set once we learn the due index doesn't exist yet, so we stop trying it */
  private dueIndexMissing = false;

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
    this.tableName = tableName || cfg.dynamoDbScheduledPostsTableName;
  }

  async createPost(record: ScheduledPostRecord): Promise<ScheduledPostRecord> {
    await this.docClient.send(new PutCommand({ TableName: this.tableName, Item: this.recordToItem(record) }));
    return record;
  }

  async createPosts(records: ScheduledPostRecord[]): Promise<ScheduledPostRecord[]> {
    await this.batchWrite(records.map((r) => ({ PutRequest: { Item: this.recordToItem(r) } })));
    return records;
  }

  async getPostById(postId: string, userId?: string): Promise<ScheduledPostRecord | null> {
    const result = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { postId } }));
    if (!result.Item) return null;
    if (userId !== undefined && result.Item.userId !== userId) return null;
    return this.itemToRecord(result.Item as PostItem);
  }

  async postExists(postId: string): Promise<boolean> {
    const result = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { postId } }));
    return !!result.Item;
  }

  /** List all posts for a user via UserIdIndex, sorted by scheduledDate ascending. */
  async listPostsByUser(userId: string): Promise<ScheduledPostRecord[]> {
    return this.queryAll({
      TableName: this.tableName,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: true,
    });
  }

  async listPostsByStrategy(strategyId: string): Promise<ScheduledPostRecord[]> {
    return this.queryAll({
      TableName: this.tableName,
      IndexName: 'StrategyIdIndex',
      KeyConditionExpression: 'strategyId = :strategyId',
      ExpressionAttributeValues: { ':strategyId': strategyId },
      ScanIndexForward: true,
    });
  }

  /**
   * Update post fields and set updatedAt. `updates` uses snake_case keys; null
   * removes nullable attributes. Returns null if the post doesn't exist (or no
   * longer has `expectedStatus`), rather than creating a partial item.
   */
  async updatePost(
    postId: string,
    updates: PostUpdates,
    { expectedStatus }: { expectedStatus?: PostStatus | PostStatus[] } = {}
  ): Promise<ScheduledPostRecord | null> {
    const setParts: string[] = ['#updatedAt = :updatedAt'];
    const removeParts: string[] = [];
    const attrNames: Record<string, string> = { '#updatedAt': 'updatedAt', '#postId': 'postId' };
    const attrValues: Record<string, unknown> = { ':updatedAt': new Date().toISOString() };

    for (const [field, dbField] of Object.entries(FIELD_MAPPING)) {
      if (!(field in updates)) continue;
      const value = updates[field as keyof PostUpdates];
      if (value === undefined) continue;
      attrNames[`#${field}`] = dbField;
      if (value === null) {
        if (NULLABLE_FIELDS.has(field)) removeParts.push(`#${field}`);
        else delete attrNames[`#${field}`];
      } else {
        setParts.push(`#${field} = :${field}`);
        attrValues[`:${field}`] = value;
      }
    }

    let condition = 'attribute_exists(#postId)';
    if (expectedStatus) {
      const statuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
      attrNames['#currentStatus'] = 'status';
      statuses.forEach((s, i) => (attrValues[`:expected${i}`] = s));
      condition += ` AND #currentStatus IN (${statuses.map((_, i) => `:expected${i}`).join(', ')})`;
    }

    try {
      const result = await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { postId },
          UpdateExpression: `SET ${setParts.join(', ')}${removeParts.length ? ` REMOVE ${removeParts.join(', ')}` : ''}`,
          ConditionExpression: condition,
          ExpressionAttributeNames: attrNames,
          ExpressionAttributeValues: attrValues,
          ReturnValues: 'ALL_NEW',
        })
      );
      return this.itemToRecord(result.Attributes as PostItem);
    } catch (error) {
      if (isConditionFailure(error)) return null;
      throw error;
    }
  }

  /**
   * Atomically take a post for publishing: scheduled -> publishing, counting the
   * attempt. Returns null if it isn't claimable (another publisher has it, it was
   * deleted or rescheduled, or it's waiting out a retry delay).
   * `manual` claims a scheduled, draft or failed post straight away.
   */
  async claimPost(postId: string, { manual = false }: { manual?: boolean } = {}): Promise<ScheduledPostRecord | null> {
    const now = new Date().toISOString();
    const condition = manual
      ? '#status IN (:scheduled, :draft, :failed)'
      : '#status = :scheduled AND (attribute_not_exists(#nextAttemptAt) OR #nextAttemptAt <= :now)';
    try {
      const result = await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { postId },
          UpdateExpression:
            'SET #status = :publishing, #claimedAt = :now, #updatedAt = :now, ' +
            '#publishAttempts = if_not_exists(#publishAttempts, :zero) + :one',
          ConditionExpression: condition,
          ExpressionAttributeNames: {
            '#status': 'status',
            '#claimedAt': 'claimedAt',
            '#updatedAt': 'updatedAt',
            '#publishAttempts': 'publishAttempts',
            ...(manual ? {} : { '#nextAttemptAt': 'nextAttemptAt' }),
          },
          ExpressionAttributeValues: {
            ':publishing': 'publishing',
            ':scheduled': 'scheduled',
            ':now': now,
            ':zero': 0,
            ':one': 1,
            ...(manual ? { ':draft': 'draft', ':failed': 'failed' } : {}),
          },
          ReturnValues: 'ALL_NEW',
        })
      );
      return this.itemToRecord(result.Attributes as PostItem);
    } catch (error) {
      if (isConditionFailure(error)) return null;
      throw error;
    }
  }

  /** Delete all posts for a user. Returns the number of deleted records. */
  async deleteAllByUser(userId: string): Promise<number> {
    const posts = await this.listPostsByUser(userId);
    await this.batchWrite(posts.map((p) => ({ DeleteRequest: { Key: { postId: p.id } } })));
    return posts.length;
  }

  /** Returns true if deleted. */
  async deletePost(postId: string): Promise<boolean> {
    const result = await this.docClient.send(
      new DeleteCommand({ TableName: this.tableName, Key: { postId }, ReturnValues: 'ALL_OLD' })
    );
    return !!result.Attributes;
  }

  /**
   * Scheduled posts due by `now` (UTC ISO), across all users. Uses the
   * StatusDueIndex when it exists; until then, a scan filtered to scheduled posts.
   */
  async findDuePosts(now: string): Promise<ScheduledPostRecord[]> {
    const viaIndex = await this.queryByStatus('scheduled', now);
    if (viaIndex) return viaIndex;
    const scheduled = await this.scanByStatus('scheduled');
    return scheduled.filter((p) => dueOk(p, now));
  }

  /** Posts a publisher claimed but never finished (e.g. the server stopped mid-publish) */
  async findStuckPublishing(claimedBefore: string): Promise<ScheduledPostRecord[]> {
    const publishing = (await this.queryByStatus('publishing')) ?? (await this.scanByStatus('publishing'));
    return publishing.filter((p) => !p.claimed_at || p.claimed_at < claimedBefore);
  }

  /** Scheduled posts saved before dueAt existed; they need it to show up in the due index */
  async findScheduledWithoutDueAt(): Promise<ScheduledPostRecord[]> {
    const items = await this.scanAllPages({
      TableName: this.tableName,
      FilterExpression: '#status = :scheduled AND attribute_not_exists(#dueAt)',
      ExpressionAttributeNames: { '#status': 'status', '#dueAt': 'dueAt' },
      ExpressionAttributeValues: { ':scheduled': 'scheduled' },
    });
    return items.map((item) => this.itemToRecord(item));
  }

  /** Query the due index for a status (optionally due by `dueBy`); null if the index doesn't exist yet */
  private async queryByStatus(status: PostStatus, dueBy?: string): Promise<ScheduledPostRecord[] | null> {
    if (this.dueIndexMissing) return null;
    try {
      return await this.queryAll({
        TableName: this.tableName,
        IndexName: DUE_INDEX,
        KeyConditionExpression: dueBy ? '#status = :status AND #dueAt <= :dueBy' : '#status = :status',
        ExpressionAttributeNames: dueBy ? { '#status': 'status', '#dueAt': 'dueAt' } : { '#status': 'status' },
        ExpressionAttributeValues: dueBy ? { ':status': status, ':dueBy': dueBy } : { ':status': status },
      });
    } catch (error) {
      // The table has no StatusDueIndex until terraform/scheduled-posts-table.tf is applied
      if ((error as { name?: string }).name === 'ValidationException') {
        console.warn(`${DUE_INDEX} not found on ${this.tableName}; scanning for due posts instead`);
        this.dueIndexMissing = true;
        return null;
      }
      throw error;
    }
  }

  private async scanByStatus(status: PostStatus): Promise<ScheduledPostRecord[]> {
    const items = await this.scanAllPages({
      TableName: this.tableName,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
    });
    return items.map((item) => this.itemToRecord(item));
  }

  /** Run a query to the end, following pages (a single response stops at 1 MB) */
  private async queryAll(input: QueryCommandInput): Promise<ScheduledPostRecord[]> {
    const items: PostItem[] = [];
    let startKey: QueryCommandInput['ExclusiveStartKey'];
    do {
      const result: QueryCommandOutput = await this.docClient.send(new QueryCommand({ ...input, ExclusiveStartKey: startKey }));
      items.push(...((result.Items ?? []) as PostItem[]));
      startKey = result.LastEvaluatedKey;
    } while (startKey);
    return items.map((item) => this.itemToRecord(item));
  }

  private async scanAllPages(input: ScanCommandInput): Promise<PostItem[]> {
    const items: PostItem[] = [];
    let startKey: ScanCommandInput['ExclusiveStartKey'];
    do {
      const result: ScanCommandOutput = await this.docClient.send(new ScanCommand({ ...input, ExclusiveStartKey: startKey }));
      items.push(...((result.Items ?? []) as PostItem[]));
      startKey = result.LastEvaluatedKey;
    } while (startKey);
    return items;
  }

  /** Write in chunks of 25, retrying anything DynamoDB leaves unprocessed (e.g. when throttled) */
  private async batchWrite(requests: WriteRequests): Promise<void> {
    for (let i = 0; i < requests.length; i += 25) {
      let pending: WriteRequests | undefined = requests.slice(i, i + 25);
      for (let attempt = 0; pending?.length && attempt < 6; attempt++) {
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
        const result: BatchWriteCommandOutput = await this.docClient.send(
          new BatchWriteCommand({ RequestItems: { [this.tableName]: pending } })
        );
        pending = result.UnprocessedItems?.[this.tableName];
      }
      if (pending?.length) throw new Error(`DynamoDB did not accept ${pending.length} scheduled-post writes after retries`);
    }
  }

  private recordToItem(record: ScheduledPostRecord): PostItem {
    const item: PostItem = {
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
      publishAttempts: record.publish_attempts ?? 0,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
    const dueAt = record.due_at || dueAtOf(record.scheduled_date, record.scheduled_time);
    if (dueAt) item.dueAt = dueAt;
    if (record.media_id != null) item.mediaId = record.media_id;
    if (record.media_type != null) item.mediaType = record.media_type;
    if (record.next_attempt_at) item.nextAttemptAt = record.next_attempt_at;
    if (record.published_at) item.publishedAt = record.published_at;
    if (record.last_error_code) item.lastErrorCode = record.last_error_code;
    if (record.last_error) item.lastError = record.last_error;
    return item;
  }

  private itemToRecord(item: PostItem): ScheduledPostRecord {
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
      due_at: item.dueAt,
      publish_attempts: item.publishAttempts ?? 0,
      next_attempt_at: item.nextAttemptAt ?? null,
      claimed_at: item.claimedAt ?? null,
      published_at: item.publishedAt ?? null,
      last_error_code: item.lastErrorCode ?? null,
      last_error: item.lastError ?? null,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

/** A scheduled post found by the fallback scan is due if its time has come */
function dueOk(post: ScheduledPostRecord, now: string): boolean {
  const due = post.due_at || dueAtOf(post.scheduled_date, post.scheduled_time);
  return !!due && due <= now;
}
