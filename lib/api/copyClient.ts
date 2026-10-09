/**
 * API Client for Copywriter Agent Backend
 * Handles communication with the Python FastAPI service for copy operations
 */

import { CopyRecord, ChatResponse, CopyJob, CopyChatMessage, CopyWorkspace, CopyChatResult } from '@/types/agent';
import type {
  CopyRecord as WireCopyRecord,
  ChatResponse as WireChatResponse,
  CopyJob as WireCopyJob,
  CopyChatMessage as WireChatMessage,
} from '@/lib/models/copy';

// Use relative URLs — Next.js rewrites proxy /api/copy/* to the Python backend
const API_BASE_URL = '';

/**
 * Custom error class for Copy API errors
 */
export class CopyAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CopyAPIError';
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
 * Handle authentication errors by redirecting to login
 */
function handleAuthError(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}

/**
 * Convert snake_case copy record from Python to camelCase for TypeScript
 */
function convertCopyRecord(record: WireCopyRecord): CopyRecord {
  return {
    id: record.id,
    strategyId: record.strategy_id,
    userId: record.user_id,
    text: record.text,
    platform: record.platform,
    hashtags: record.hashtags || [],
    ...(record.angle ? { angle: record.angle } : {}),
    ...(record.job_id ? { jobId: record.job_id } : {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function convertJob(job: WireCopyJob): CopyJob {
  return {
    id: job.id,
    status: job.status,
    total: job.total,
    completed: job.completed || {},
    failedPlatforms: job.failed_platforms || [],
    ...(job.error ? { error: job.error } : {}),
    startedAt: job.started_at,
    updatedAt: job.updated_at,
    ...(job.finished_at ? { finishedAt: job.finished_at } : {}),
  };
}

function convertChatMessage(message: WireChatMessage): CopyChatMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    ...(message.copy_id ? { copyId: message.copy_id } : {}),
    ...(message.action ? { action: message.action } : {}),
    createdAt: message.created_at,
  };
}

/** Send an authenticated JSON request and map errors to CopyAPIError */
async function copyRequest<T>(path: string, init: RequestInit, failure: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: createAuthHeaders() });
  } catch (error) {
    throw new CopyAPIError('Network error: Unable to connect to the copy service.', undefined, error);
  }
  if (response.status === 401) {
    handleAuthError();
    throw new CopyAPIError('Authentication required. Please log in again.', 401);
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new CopyAPIError(errorData.detail || failure, response.status, errorData);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}

/** A strategy's copies, latest generation job and saved chat */
export async function getCopyWorkspace(strategyId: string): Promise<CopyWorkspace> {
  const data = await copyRequest<{ copies?: WireCopyRecord[]; job: WireCopyJob | null; chat?: WireChatMessage[] }>(
    `/api/copy/workspace/${encodeURIComponent(strategyId)}`,
    { method: 'GET' },
    'Failed to load your copies. Please try again.'
  );
  return {
    copies: (data.copies || []).map(convertCopyRecord),
    job: data.job ? convertJob(data.job) : null,
    chat: (data.chat || []).map(convertChatMessage),
  };
}

/** Start writing a full set in the background for the given platforms; returns the job straight away */
export async function startCopyJob(strategyId: string, platforms?: string[]): Promise<CopyJob> {
  const data = await copyRequest<WireCopyJob>(
    '/api/copy/jobs',
    { method: 'POST', body: JSON.stringify({ strategy_id: strategyId, ...(platforms?.length ? { platforms } : {}) }) },
    'Could not start generating copies. Please try again.'
  );
  return convertJob(data);
}

/** Send a chat message; copyId is the copy the user has open, if any */
export async function sendCopyChat(strategyId: string, message: string, copyId?: string): Promise<CopyChatResult> {
  const data = await copyRequest<{ messages?: WireChatMessage[]; copy?: WireCopyRecord; job?: WireCopyJob }>(
    '/api/copy/chat',
    { method: 'POST', body: JSON.stringify({ strategy_id: strategyId, message, ...(copyId ? { copy_id: copyId } : {}) }) },
    'The copywriter could not answer. Please try again.'
  );
  return {
    messages: (data.messages || []).map(convertChatMessage),
    ...(data.copy ? { copy: convertCopyRecord(data.copy) } : {}),
    ...(data.job ? { job: convertJob(data.job) } : {}),
  };
}

/** Save the user's edits to a copy */
export async function updateCopy(copyId: string, text: string, hashtags: string[]): Promise<CopyRecord> {
  const data = await copyRequest<WireCopyRecord>(
    `/api/copy/${encodeURIComponent(copyId)}`,
    { method: 'PATCH', body: JSON.stringify({ text, hashtags }) },
    'Failed to save the copy. Please try again.'
  );
  return convertCopyRecord(data);
}

/**
 * Convert snake_case chat response from Python to camelCase for TypeScript
 */
function convertChatResponse(response: WireChatResponse): ChatResponse {
  return {
    updatedText: response.updated_text,
    updatedHashtags: response.updated_hashtags || [],
    aiMessage: response.ai_message,
  };
}

/**
 * Generate copies from a strategy using the Copywriter Agent
 * 
 * @param strategyId - ID of the strategy to generate copies from
 * @returns Promise resolving to an array of generated copy records
 * @throws CopyAPIError if the request fails
 */
export async function generateCopies(strategyId: string): Promise<CopyRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/copy/generate`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ strategy_id: strategyId }),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new CopyAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new CopyAPIError('Access denied. You do not have permission to access this strategy.', 403);
    }
    if (response.status === 404) {
      throw new CopyAPIError('Strategy not found.', 404);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new CopyAPIError(
        errorData.detail || `Failed to generate copies: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data.map(convertCopyRecord);
  } catch (error) {
    if (error instanceof CopyAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CopyAPIError('Network error: Unable to connect to the copy service.', undefined, error);
    }
    throw new CopyAPIError('An unexpected error occurred while generating copies', undefined, error);
  }
}

/**
 * List all copies for a given strategy
 * 
 * @param strategyId - ID of the strategy to list copies for
 * @returns Promise resolving to an array of copy records
 * @throws CopyAPIError if the request fails
 */
export async function listCopies(strategyId: string): Promise<CopyRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/copy/list/${strategyId}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new CopyAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new CopyAPIError('Access denied. You do not have permission to view these copies.', 403);
    }
    if (response.status === 404) {
      throw new CopyAPIError('Strategy not found.', 404);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new CopyAPIError(
        errorData.detail || `Failed to list copies: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data.map(convertCopyRecord);
  } catch (error) {
    if (error instanceof CopyAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CopyAPIError('Network error: Unable to connect to the copy service.', undefined, error);
    }
    throw new CopyAPIError('An unexpected error occurred while listing copies', undefined, error);
  }
}

/**
 * Get a specific copy by ID
 * 
 * @param copyId - ID of the copy to retrieve
 * @returns Promise resolving to the copy record
 * @throws CopyAPIError if the request fails
 */
export async function getCopy(copyId: string): Promise<CopyRecord> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/copy/${copyId}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new CopyAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new CopyAPIError('Access denied. You do not have permission to view this copy.', 403);
    }
    if (response.status === 404) {
      throw new CopyAPIError('Copy not found.', 404);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new CopyAPIError(
        errorData.detail || `Failed to get copy: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return convertCopyRecord(data);
  } catch (error) {
    if (error instanceof CopyAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CopyAPIError('Network error: Unable to connect to the copy service.', undefined, error);
    }
    throw new CopyAPIError('An unexpected error occurred while getting the copy', undefined, error);
  }
}

/**
 * Chat with the AI to refine a specific copy
 * 
 * @param copyId - ID of the copy to refine
 * @param message - User message describing desired changes
 * @returns Promise resolving to the chat response with updated copy
 * @throws CopyAPIError if the request fails
 */
export async function chatRefineCopy(copyId: string, message: string): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/copy/${copyId}/chat`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ message }),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new CopyAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new CopyAPIError('Access denied. You do not have permission to modify this copy.', 403);
    }
    if (response.status === 404) {
      throw new CopyAPIError('Copy not found.', 404);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new CopyAPIError(
        errorData.detail || `Failed to refine copy: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return convertChatResponse(data);
  } catch (error) {
    if (error instanceof CopyAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CopyAPIError('Network error: Unable to connect to the copy service.', undefined, error);
    }
    throw new CopyAPIError('An unexpected error occurred while refining the copy', undefined, error);
  }
}

/**
 * Refine arbitrary post text using the Copywriter Agent.
 * Does not require a copyId — works with raw text.
 *
 * @param text - Current post text to refine
 * @param platform - Target platform (e.g. 'linkedin', 'twitter')
 * @param message - User's refinement instruction
 * @param hashtags - Optional current hashtags
 * @returns Promise resolving to the chat response with updated text
 * @throws CopyAPIError if the request fails
 */
export async function refineText(
  text: string,
  platform: string,
  message: string,
  hashtags: string[] = []
): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/copy/refine-text`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ text, platform, message, hashtags }),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new CopyAPIError('Authentication required. Please log in again.', 401);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new CopyAPIError(
        errorData.detail || `Failed to refine text: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return convertChatResponse(data);
  } catch (error) {
    if (error instanceof CopyAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CopyAPIError('Network error: Unable to connect to the copy service.', undefined, error);
    }
    throw new CopyAPIError('An unexpected error occurred while refining text', undefined, error);
  }
}

/**
 * Delete a specific copy
 *
 * @param copyId - ID of the copy to delete
 * @throws CopyAPIError if the request fails
 */
export async function deleteCopy(copyId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/copy/${copyId}`, {
      method: 'DELETE',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new CopyAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new CopyAPIError('Access denied. You do not have permission to delete this copy.', 403);
    }
    if (response.status === 404) {
      throw new CopyAPIError('Copy not found.', 404);
    }
    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      throw new CopyAPIError(
        errorData.detail || `Failed to delete copy: ${response.statusText}`,
        response.status,
        errorData
      );
    }
  } catch (error) {
    if (error instanceof CopyAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CopyAPIError('Network error: Unable to connect to the copy service.', undefined, error);
    }
    throw new CopyAPIError('An unexpected error occurred while deleting the copy', undefined, error);
  }
}

/** What one platform of a running full set is writing right now */
export interface CopyJobLane {
  angle?: string;
  text: string;
  written: number;
  done: boolean;
}

export type CopyJobFeedEvent =
  | { type: 'update'; lanes: Record<string, CopyJobLane> }
  | { type: 'copy'; platform: string }
  | { type: 'done' };

/**
 * Follow a running job's live text. Calls `onEvent` until the job finishes,
 * the server has no live feed for it, or `signal` aborts. Resolves when the
 * stream ends; never throws for a dropped connection (the caller's polling
 * still picks up saved copies).
 */
export async function followCopyJob(
  strategyId: string,
  jobId: string,
  onEvent: (event: CopyJobFeedEvent) => void,
  signal: AbortSignal
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/copy/jobs/${encodeURIComponent(jobId)}/stream?strategy_id=${encodeURIComponent(strategyId)}`,
      { headers: createAuthHeaders(), signal }
    );
  } catch {
    return;
  }
  if (!response.ok || !response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const type = /^event: (.+)$/m.exec(frame)?.[1];
        const data = /^data: (.*)$/m.exec(frame)?.[1];
        if (!type || data === undefined) continue;
        try {
          onEvent({ type, ...JSON.parse(data) } as CopyJobFeedEvent);
        } catch {
          // Ignore a malformed frame
        }
      }
    }
  } catch {
    // Aborted or the connection dropped
  } finally {
    reader.releaseLock();
  }
}

/** Delete every copy in a set (a full set's job id, or OTHER_COPIES_SET); returns how many were deleted */
export async function deleteCopySet(strategyId: string, setId: string): Promise<number> {
  const data = await copyRequest<{ deleted: number }>(
    `/api/copy/sets/${encodeURIComponent(setId)}?strategy_id=${encodeURIComponent(strategyId)}`,
    { method: 'DELETE' },
    'Failed to delete the copies. Please try again.'
  );
  return data.deleted;
}
