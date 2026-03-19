/**
 * API Client for Scheduler Agent Backend
 * Handles communication with the Python FastAPI service for scheduling operations
 */

import { ScheduledPost, ManualScheduleInput, ScheduledPostUpdate } from '@/types/scheduler';

const API_BASE_URL = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * Custom error class for Scheduler API errors
 */
export class SchedulerAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SchedulerAPIError';
  }
}

/**
 * Get JWT token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('token');
}

/**
 * Create headers with JWT authentication
 */
function createAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Handle authentication errors by clearing token and redirecting to login
 */
function handleAuthError(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}


/**
 * Convert snake_case scheduled post record from Python to camelCase for TypeScript
 */
function convertScheduledPost(record: any): ScheduledPost {
  return {
    id: record.id,
    strategyId: record.strategy_id,
    copyId: record.copy_id,
    userId: record.user_id,
    content: record.content,
    platform: record.platform,
    hashtags: record.hashtags || [],
    scheduledDate: record.scheduled_date,
    scheduledTime: record.scheduled_time,
    status: record.status,
    strategyColor: record.strategy_color || '',
    strategyLabel: record.strategy_label || '',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Auto-schedule all copies for a strategy using the AI agent
 * 
 * @param strategyId - ID of the strategy to auto-schedule copies from
 * @returns Promise resolving to an array of scheduled post records
 * @throws SchedulerAPIError if the request fails
 */
export async function autoSchedule(strategyId: string): Promise<ScheduledPost[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scheduler/auto-schedule`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ strategy_id: strategyId }),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new SchedulerAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new SchedulerAPIError('Access denied. You do not have permission to access this strategy.', 403);
    }
    if (response.status === 404) {
      throw new SchedulerAPIError('Strategy not found.', 404);
    }
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || 'No copies available to schedule for this strategy.',
        400,
        errorData
      );
    }
    if (response.status === 503) {
      throw new SchedulerAPIError('Scheduling service is temporarily unavailable. Please try again later.', 503);
    }
    if (response.status === 504) {
      throw new SchedulerAPIError('Scheduling request timed out. Please try again.', 504);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || `Failed to auto-schedule: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data.map(convertScheduledPost);
  } catch (error) {
    if (error instanceof SchedulerAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SchedulerAPIError('Network error: Unable to connect to the scheduler service.', undefined, error);
    }
    throw new SchedulerAPIError('An unexpected error occurred while auto-scheduling', undefined, error);
  }
}


/**
 * Manually schedule a single copy to a specific date and time
 * 
 * @param input - Manual schedule input with copyId, date, time, and platform
 * @returns Promise resolving to the created scheduled post record
 * @throws SchedulerAPIError if the request fails
 */
export async function manualSchedule(input: ManualScheduleInput): Promise<ScheduledPost> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scheduler/manual-schedule`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        copy_id: input.copyId,
        scheduled_date: input.scheduledDate,
        scheduled_time: input.scheduledTime,
        platform: input.platform,
      }),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new SchedulerAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new SchedulerAPIError('Access denied. You do not have permission to schedule this copy.', 403);
    }
    if (response.status === 404) {
      throw new SchedulerAPIError('Copy not found.', 404);
    }
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || 'Invalid scheduling input. Please check date and time format.',
        400,
        errorData
      );
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || `Failed to schedule post: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return convertScheduledPost(data);
  } catch (error) {
    if (error instanceof SchedulerAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SchedulerAPIError('Network error: Unable to connect to the scheduler service.', undefined, error);
    }
    throw new SchedulerAPIError('An unexpected error occurred while scheduling the post', undefined, error);
  }
}

/**
 * List all scheduled posts for the authenticated user
 * 
 * @returns Promise resolving to an array of scheduled post records
 * @throws SchedulerAPIError if the request fails
 */
export async function listPosts(): Promise<ScheduledPost[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scheduler/posts`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new SchedulerAPIError('Authentication required. Please log in again.', 401);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || `Failed to list posts: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data.map(convertScheduledPost);
  } catch (error) {
    if (error instanceof SchedulerAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SchedulerAPIError('Network error: Unable to connect to the scheduler service.', undefined, error);
    }
    throw new SchedulerAPIError('An unexpected error occurred while listing posts', undefined, error);
  }
}

/**
 * List scheduled posts filtered by strategy
 * 
 * @param strategyId - ID of the strategy to filter by
 * @returns Promise resolving to an array of scheduled post records
 * @throws SchedulerAPIError if the request fails
 */
export async function listPostsByStrategy(strategyId: string): Promise<ScheduledPost[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scheduler/posts/strategy/${strategyId}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new SchedulerAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new SchedulerAPIError('Access denied. You do not have permission to view this strategy\'s posts.', 403);
    }
    if (response.status === 404) {
      throw new SchedulerAPIError('Strategy not found.', 404);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || `Failed to list posts by strategy: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data.map(convertScheduledPost);
  } catch (error) {
    if (error instanceof SchedulerAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SchedulerAPIError('Network error: Unable to connect to the scheduler service.', undefined, error);
    }
    throw new SchedulerAPIError('An unexpected error occurred while listing posts by strategy', undefined, error);
  }
}


/**
 * Get a specific scheduled post by ID
 * 
 * @param postId - ID of the post to retrieve
 * @returns Promise resolving to the scheduled post record
 * @throws SchedulerAPIError if the request fails
 */
export async function getPost(postId: string): Promise<ScheduledPost> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scheduler/posts/${postId}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new SchedulerAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new SchedulerAPIError('Access denied. You do not have permission to view this post.', 403);
    }
    if (response.status === 404) {
      throw new SchedulerAPIError('Post not found.', 404);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || `Failed to get post: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return convertScheduledPost(data);
  } catch (error) {
    if (error instanceof SchedulerAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SchedulerAPIError('Network error: Unable to connect to the scheduler service.', undefined, error);
    }
    throw new SchedulerAPIError('An unexpected error occurred while getting the post', undefined, error);
  }
}

/**
 * Update a scheduled post
 * 
 * @param postId - ID of the post to update
 * @param data - Fields to update
 * @returns Promise resolving to the updated scheduled post record
 * @throws SchedulerAPIError if the request fails
 */
export async function updatePost(postId: string, data: ScheduledPostUpdate): Promise<ScheduledPost> {
  try {
    const body: Record<string, unknown> = {};
    if (data.scheduledDate !== undefined) body.scheduled_date = data.scheduledDate;
    if (data.scheduledTime !== undefined) body.scheduled_time = data.scheduledTime;
    if (data.content !== undefined) body.content = data.content;
    if (data.platform !== undefined) body.platform = data.platform;
    if (data.hashtags !== undefined) body.hashtags = data.hashtags;
    if (data.status !== undefined) body.status = data.status;

    const response = await fetch(`${API_BASE_URL}/api/scheduler/posts/${postId}`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new SchedulerAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new SchedulerAPIError('Access denied. You do not have permission to update this post.', 403);
    }
    if (response.status === 404) {
      throw new SchedulerAPIError('Post not found.', 404);
    }
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || 'Invalid update data. Please check your input.',
        400,
        errorData
      );
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || `Failed to update post: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const responseData = await response.json();
    return convertScheduledPost(responseData);
  } catch (error) {
    if (error instanceof SchedulerAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SchedulerAPIError('Network error: Unable to connect to the scheduler service.', undefined, error);
    }
    throw new SchedulerAPIError('An unexpected error occurred while updating the post', undefined, error);
  }
}

/**
 * Delete a scheduled post
 * 
 * @param postId - ID of the post to delete
 * @throws SchedulerAPIError if the request fails
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scheduler/posts/${postId}`, {
      method: 'DELETE',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new SchedulerAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new SchedulerAPIError('Access denied. You do not have permission to delete this post.', 403);
    }
    if (response.status === 404) {
      throw new SchedulerAPIError('Post not found.', 404);
    }
    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      throw new SchedulerAPIError(
        errorData.detail || `Failed to delete post: ${response.statusText}`,
        response.status,
        errorData
      );
    }
  } catch (error) {
    if (error instanceof SchedulerAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SchedulerAPIError('Network error: Unable to connect to the scheduler service.', undefined, error);
    }
    throw new SchedulerAPIError('An unexpected error occurred while deleting the post', undefined, error);
  }
}
