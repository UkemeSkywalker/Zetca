/**
 * DynamoDB User Repository
 * Handles all database operations for user data
 */

import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../config';
import { randomUUID } from 'crypto';
import { accountsOf, pickAccount, tokenOf, type LinkedInAccount } from '../linkedin/accounts';

/**
 * User record structure in DynamoDB
 */
export interface UserRecord {
  userId: string;           // Primary Key (Partition Key)
  email: string;            // Global Secondary Index
  passwordHash: string;
  name: string;
  company?: string;
  bio?: string;
  createdAt: string;        // ISO 8601 timestamp
  lastModified: string;     // ISO 8601 timestamp

  // LinkedIn OAuth fields (optional, set when user connects LinkedIn)
  linkedinSub?: string;
  linkedinAccessToken?: string;
  linkedinName?: string;
  linkedinPictureUrl?: string;
  linkedinEmail?: string;
  linkedinConnectedAt?: string;
  /** Every connected LinkedIn account (lib/linkedin/accounts); the old single fields above are moved here */
  linkedinAccounts?: LinkedInAccount[];

  // YouTube OAuth fields (optional, set when user connects a channel)
  youtubeChannelId?: string;
  youtubeChannelTitle?: string;
  youtubeChannelCustomUrl?: string;
  youtubeChannelThumbnailUrl?: string;
  /** Refresh token, encrypted with lib/crypto/tokenCipher (never returned to the browser) */
  youtubeRefreshTokenEnc?: string;
  youtubeScopes?: string[];
  youtubeConnectedAt?: string;
}

/** Every YouTube attribute on the user item, for connect/disconnect */
const YOUTUBE_FIELDS = [
  'youtubeChannelId',
  'youtubeChannelTitle',
  'youtubeChannelCustomUrl',
  'youtubeChannelThumbnailUrl',
  'youtubeRefreshTokenEnc',
  'youtubeScopes',
  'youtubeConnectedAt',
] as const;

/**
 * UserRepository class for managing user data in DynamoDB
 */
export class UserRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const cfg = getConfig();
    const clientConfig: DynamoDBClientConfig = {
      region: cfg.awsRegion,
    };

    // Explicitly pass credentials from env vars if available
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: cfg.awsAccessKeyId,
        secretAccessKey: cfg.awsSecretAccessKey,
      };
    }

    const client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = cfg.dynamoDbTableName;
  }

  /**
   * Create a new user in DynamoDB
   * @param email User's email address
   * @param passwordHash Hashed password
   * @param name User's name
   * @returns Created user record
   */
  async createUser(
    email: string,
    passwordHash: string,
    name: string
  ): Promise<UserRecord> {
    const now = new Date().toISOString();
    const userId = randomUUID();

    const userRecord: UserRecord = {
      userId,
      email,
      passwordHash,
      name,
      createdAt: now,
      lastModified: now,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: userRecord,
        // Prevent overwriting existing user with same userId
        ConditionExpression: 'attribute_not_exists(userId)',
      })
    );

    return userRecord;
  }

  /**
   * Get user by userId (primary key lookup)
   * @param userId User's unique identifier
   * @returns User record or null if not found
   */
  async getUserById(userId: string): Promise<UserRecord | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { userId },
      })
    );

    return (result.Item as UserRecord) || null;
  }

  /**
   * Retrieve LinkedIn credentials for a user (used by the publisher service):
   * the account asked for, or the default one. Returns null if the user is not
   * found, and empty credentials if that account isn't connected.
   */
  async getUserLinkedInCredentials(
    userId: string,
    accountId?: string | null
  ): Promise<{ linkedinAccessToken?: string; linkedinSub?: string; linkedinName?: string } | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;
    const account = pickAccount(accountsOf(user), accountId);
    if (!account) return {};
    return { linkedinAccessToken: tokenOf(account), linkedinSub: account.id, linkedinName: account.name };
  }

  /** The user's connected LinkedIn accounts, the default first */
  async getLinkedInAccounts(userId: string): Promise<LinkedInAccount[]> {
    const user = await this.getUserById(userId);
    return user ? accountsOf(user) : [];
  }

  /**
   * Add a LinkedIn account, or refresh it if it's already connected (keeping
   * its place in the list). The old single connection is moved into the list.
   */
  async addLinkedInAccount(userId: string, account: LinkedInAccount): Promise<LinkedInAccount[]> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');
    const list = accountsOf(user);
    const at = list.findIndex((a) => a.id === account.id);
    if (at >= 0) list[at] = account;
    else list.push(account);
    await this.saveLinkedInAccounts(userId, list);
    return list;
  }

  /** Remove one LinkedIn account */
  async removeLinkedInAccount(userId: string, accountId: string): Promise<LinkedInAccount[]> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');
    const list = accountsOf(user).filter((a) => a.id !== accountId);
    await this.saveLinkedInAccounts(userId, list);
    return list;
  }

  /** Make an account the default (first in the list) */
  async setDefaultLinkedInAccount(userId: string, accountId: string): Promise<LinkedInAccount[]> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');
    const list = accountsOf(user);
    const chosen = list.find((a) => a.id === accountId);
    if (!chosen) throw new Error('LinkedIn account not connected');
    const next = [chosen, ...list.filter((a) => a !== chosen)];
    await this.saveLinkedInAccounts(userId, next);
    return next;
  }

  /** Store the account list and drop the old single-connection fields */
  private async saveLinkedInAccounts(userId: string, list: LinkedInAccount[]): Promise<void> {
    const legacy = ['linkedinSub', 'linkedinAccessToken', 'linkedinName', 'linkedinPictureUrl', 'linkedinEmail', 'linkedinConnectedAt'];
    const names: Record<string, string> = { '#accounts': 'linkedinAccounts', '#lastModified': 'lastModified' };
    legacy.forEach((f) => (names[`#${f}`] = f));
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: `SET #accounts = :accounts, #lastModified = :lastModified REMOVE ${legacy.map((f) => `#${f}`).join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: { ':accounts': list, ':lastModified': new Date().toISOString() },
        ConditionExpression: 'attribute_exists(userId)',
      })
    );
  }

  /**
   * Get user by email using Global Secondary Index
   * @param email User's email address
   * @returns User record or null if not found
   */
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as UserRecord;
  }

  /**
   * Update user record
   * @param userId User's unique identifier
   * @param updates Partial user data to update
   * @returns Updated user record
   */
  async updateUser(
    userId: string,
    updates: Partial<Omit<UserRecord, 'userId' | 'createdAt'>>
  ): Promise<UserRecord> {
    const now = new Date().toISOString();
    
    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    // Always update lastModified
    updateExpressions.push('#lastModified = :lastModified');
    expressionAttributeNames['#lastModified'] = 'lastModified';
    expressionAttributeValues[':lastModified'] = now;

    // Add other fields to update
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'userId' && key !== 'createdAt' && value !== undefined) {
        const placeholder = `#${key}`;
        const valuePlaceholder = `:${key}`;
        updateExpressions.push(`${placeholder} = ${valuePlaceholder}`);
        expressionAttributeNames[placeholder] = key;
        expressionAttributeValues[valuePlaceholder] = value;
      }
    });

    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
        // Ensure user exists before updating
        ConditionExpression: 'attribute_exists(userId)',
      })
    );

    return result.Attributes as UserRecord;
  }

  /**
   * Store LinkedIn connection data for a user
   */
  async connectLinkedIn(
    userId: string,
    linkedinData: {
      linkedinSub: string;
      linkedinAccessToken: string;
      linkedinName: string;
      linkedinPictureUrl?: string;
      linkedinEmail?: string;
    }
  ): Promise<UserRecord> {
    const now = new Date().toISOString();

    const expressionAttributeNames: Record<string, string> = {
      '#linkedinSub': 'linkedinSub',
      '#linkedinAccessToken': 'linkedinAccessToken',
      '#linkedinName': 'linkedinName',
      '#linkedinConnectedAt': 'linkedinConnectedAt',
      '#lastModified': 'lastModified',
    };
    const expressionAttributeValues: Record<string, unknown> = {
      ':linkedinSub': linkedinData.linkedinSub,
      ':linkedinAccessToken': linkedinData.linkedinAccessToken,
      ':linkedinName': linkedinData.linkedinName,
      ':linkedinConnectedAt': now,
      ':lastModified': now,
    };

    const setParts = [
      '#linkedinSub = :linkedinSub',
      '#linkedinAccessToken = :linkedinAccessToken',
      '#linkedinName = :linkedinName',
      '#linkedinConnectedAt = :linkedinConnectedAt',
      '#lastModified = :lastModified',
    ];

    if (linkedinData.linkedinPictureUrl !== undefined) {
      expressionAttributeNames['#linkedinPictureUrl'] = 'linkedinPictureUrl';
      expressionAttributeValues[':linkedinPictureUrl'] = linkedinData.linkedinPictureUrl;
      setParts.push('#linkedinPictureUrl = :linkedinPictureUrl');
    }

    if (linkedinData.linkedinEmail !== undefined) {
      expressionAttributeNames['#linkedinEmail'] = 'linkedinEmail';
      expressionAttributeValues[':linkedinEmail'] = linkedinData.linkedinEmail;
      setParts.push('#linkedinEmail = :linkedinEmail');
    }

    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: `SET ${setParts.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(userId)',
      })
    );

    return result.Attributes as UserRecord;
  }

  /** Store a connected YouTube channel (replacing any previous one) */
  async connectYouTube(
    userId: string,
    data: {
      channelId: string;
      channelTitle: string;
      channelCustomUrl?: string;
      channelThumbnailUrl?: string;
      refreshTokenEnc: string;
      scopes: string[];
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    const values: Record<string, unknown> = {
      youtubeChannelId: data.channelId,
      youtubeChannelTitle: data.channelTitle,
      youtubeRefreshTokenEnc: data.refreshTokenEnc,
      youtubeScopes: data.scopes,
      youtubeConnectedAt: now,
    };
    if (data.channelCustomUrl) values.youtubeChannelCustomUrl = data.channelCustomUrl;
    if (data.channelThumbnailUrl) values.youtubeChannelThumbnailUrl = data.channelThumbnailUrl;
    const removed = YOUTUBE_FIELDS.filter((f) => !(f in values));

    const names: Record<string, string> = { '#lastModified': 'lastModified' };
    const attrValues: Record<string, unknown> = { ':lastModified': now };
    const sets = ['#lastModified = :lastModified'];
    for (const [field, value] of Object.entries(values)) {
      names[`#${field}`] = field;
      attrValues[`:${field}`] = value;
      sets.push(`#${field} = :${field}`);
    }
    removed.forEach((f) => (names[`#${f}`] = f));

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: `SET ${sets.join(', ')}${removed.length ? ` REMOVE ${removed.map((f) => `#${f}`).join(', ')}` : ''}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: attrValues,
        ConditionExpression: 'attribute_exists(userId)',
      })
    );
  }

  /** Remove the user's YouTube connection */
  async disconnectYouTube(userId: string): Promise<void> {
    const names: Record<string, string> = { '#lastModified': 'lastModified' };
    YOUTUBE_FIELDS.forEach((f) => (names[`#${f}`] = f));
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: `REMOVE ${YOUTUBE_FIELDS.map((f) => `#${f}`).join(', ')} SET #lastModified = :lastModified`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: { ':lastModified': new Date().toISOString() },
        ConditionExpression: 'attribute_exists(userId)',
      })
    );
  }

  /**
   * Remove all LinkedIn connection data from a user record
   */
  async disconnectLinkedIn(userId: string): Promise<UserRecord> {
    const now = new Date().toISOString();

    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression:
          'REMOVE #linkedinSub, #linkedinAccessToken, #linkedinName, #linkedinPictureUrl, #linkedinEmail, #linkedinConnectedAt, #linkedinAccounts SET #lastModified = :lastModified',
        ExpressionAttributeNames: {
          '#linkedinSub': 'linkedinSub',
          '#linkedinAccessToken': 'linkedinAccessToken',
          '#linkedinName': 'linkedinName',
          '#linkedinPictureUrl': 'linkedinPictureUrl',
          '#linkedinEmail': 'linkedinEmail',
          '#linkedinConnectedAt': 'linkedinConnectedAt',
          '#linkedinAccounts': 'linkedinAccounts',
          '#lastModified': 'lastModified',
        },
        ExpressionAttributeValues: {
          ':lastModified': now,
        },
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(userId)',
      })
    );

    return result.Attributes as UserRecord;
  }

  /**
   * Delete user from DynamoDB
   * @param userId User's unique identifier
   */
  async deleteUser(userId: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { userId },
      })
    );
  }
}
