/**
 * DynamoDB User Repository
 * Handles all database operations for user data
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import { randomUUID } from 'crypto';

/**
 * User record structure in DynamoDB
 */
export interface UserRecord {
  userId: string;           // Primary Key (Partition Key)
  email: string;            // Global Secondary Index
  passwordHash: string;
  name: string;
  bio?: string;
  createdAt: string;        // ISO 8601 timestamp
  lastModified: string;     // ISO 8601 timestamp
}

/**
 * UserRepository class for managing user data in DynamoDB
 */
export class UserRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: config.awsRegion,
    });
    
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = config.dynamoDbTableName;
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
    const expressionAttributeValues: Record<string, any> = {};

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
