/**
 * API Client for Publisher Agent Backend
 * Handles communication with the Python FastAPI service for publishing operations
 */

// Use relative URLs — Next.js rewrites proxy /api/publisher/* to the Python backend
const API_BASE_URL = '';

/**
 * Custom error class for Publisher API errors
 */
export class PublisherAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PublisherAPIError';
  }
}

/**
 * Publish log record returned from the publisher API
 */
export interface PublishLogRecord {
  logId: string;
  postId: string;
  userId: string;
  platform: string;
  status: 'published' | 'failed' | 'skipped';
  linkedinPostId?: string;
  errorCode?: string;
  errorMessage?: string;
  attemptedAt: string;
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
 * Convert snake_case publish log record from Python to camelCase for TypeScript
 */
function convertPublishLogRecord(record: any): PublishLogRecord {
  return {
    logId: record.log_id,
    postId: record.post_id,
    userId: record.user_id,
    platform: record.platform,
    status: record.status,
    ...(record.linkedin_post_id ? { linkedinPostId: record.linkedin_post_id } : {}),
    ...(record.error_code ? { errorCode: record.error_code } : {}),
    ...(record.error_message ? { errorMessage: record.error_message } : {}),
    attemptedAt: record.attempted_at,
  };
}

/**
 * Publish a post to LinkedIn on-demand
 *
 * @param postId - ID of the post to publish
 * @returns Promise resolving to the publish log record
 * @throws PublisherAPIError if the request fails
 */
export async function publishPost(postId: string): Promise<PublishLogRecord> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/publisher/publish/${postId}`, {
      method: 'POST',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new PublisherAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new PublisherAPIError('Access denied. You do not have permission to publish this post.', 403);
    }
    if (response.status === 404) {
      throw new PublisherAPIError('Post not found.', 404);
    }
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new PublisherAPIError(
        errorData.detail || 'Cannot publish this post.',
        400,
        errorData
      );
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PublisherAPIError(
        errorData.detail || `Failed to publish post: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return convertPublishLogRecord(data);
  } catch (error) {
    if (error instanceof PublisherAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new PublisherAPIError('Network error: Unable to connect to the publisher service.', undefined, error);
    }
    throw new PublisherAPIError('An unexpected error occurred while publishing the post', undefined, error);
  }
}

/**
 * List all publish log records for the authenticated user
 *
 * @returns Promise resolving to an array of publish log records
 * @throws PublisherAPIError if the request fails
 */
export async function listLogs(): Promise<PublishLogRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/publisher/logs`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new PublisherAPIError('Authentication required. Please log in again.', 401);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PublisherAPIError(
        errorData.detail || `Failed to list publish logs: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data.map(convertPublishLogRecord);
  } catch (error) {
    if (error instanceof PublisherAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new PublisherAPIError('Network error: Unable to connect to the publisher service.', undefined, error);
    }
    throw new PublisherAPIError('An unexpected error occurred while listing publish logs', undefined, error);
  }
}

/**
 * List all publish log records for a specific post
 *
 * @param postId - ID of the post to get logs for
 * @returns Promise resolving to an array of publish log records
 * @throws PublisherAPIError if the request fails
 */
export async function listLogsByPost(postId: string): Promise<PublishLogRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/publisher/logs/${postId}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new PublisherAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new PublisherAPIError('Access denied. You do not have permission to view logs for this post.', 403);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PublisherAPIError(
        errorData.detail || `Failed to list publish logs for post: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data.map(convertPublishLogRecord);
  } catch (error) {
    if (error instanceof PublisherAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new PublisherAPIError('Network error: Unable to connect to the publisher service.', undefined, error);
    }
    throw new PublisherAPIError('An unexpected error occurred while listing publish logs for post', undefined, error);
  }
}
