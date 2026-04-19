/**
 * API Client for Copywriter Agent Backend
 * Handles communication with the Python FastAPI service for copy operations
 */

import { CopyRecord, ChatResponse } from '@/types/agent';

const API_BASE_URL = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:8000';

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
function convertCopyRecord(record: any): CopyRecord {
  return {
    id: record.id,
    strategyId: record.strategy_id,
    userId: record.user_id,
    text: record.text,
    platform: record.platform,
    hashtags: record.hashtags || [],
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Convert snake_case chat response from Python to camelCase for TypeScript
 */
function convertChatResponse(response: any): ChatResponse {
  return {
    updatedText: response.updated_text,
    updatedHashtags: response.updated_hashtags || [],
    aiMessage: response.ai_message,
  };
}

/**
 * Streaming event types from the copy generation SSE endpoint
 */
export interface CopyStreamEvent {
  event: 'thinking' | 'lifecycle' | 'result' | 'saved' | 'error' | 'done';
  text?: string;
  phase?: string;
  copies?: Array<{ text: string; platform: string; hashtags: string[] }>;
  message?: string;
}

/**
 * Generate copies with real-time streaming of agent thinking events.
 *
 * Connects to the SSE endpoint and yields events as they arrive.
 * The final 'saved' event contains the persisted CopyRecords.
 *
 * @param strategyId - ID of the strategy to generate copies from
 * @param onEvent - Callback invoked for each streamed event
 * @returns Promise resolving to the saved CopyRecord array
 */
export async function generateCopiesStream(
  strategyId: string,
  onEvent: (event: CopyStreamEvent) => void
): Promise<CopyRecord[]> {
  const token = getAuthToken();
  if (!token) {
    throw new CopyAPIError('Authentication required. Please log in again.', 401);
  }

  const response = await fetch(`${API_BASE_URL}/api/copy/generate-stream`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({ strategy_id: strategyId }),
  });

  if (response.status === 401) {
    handleAuthError();
    throw new CopyAPIError('Authentication required. Please log in again.', 401);
  }
  if (response.status === 403) {
    throw new CopyAPIError('Access denied.', 403);
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

  const reader = response.body?.getReader();
  if (!reader) {
    throw new CopyAPIError('Streaming not supported by browser.');
  }

  const decoder = new TextDecoder();
  let savedRecords: CopyRecord[] = [];
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE frames from the buffer
      const lines = buffer.split('\n');
      buffer = '';

      let currentEventType = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('event: ')) {
          currentEventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          try {
            const data = JSON.parse(dataStr);

            if (currentEventType === 'saved' && Array.isArray(data)) {
              savedRecords = data.map(convertCopyRecord);
            }

            onEvent({
              event: currentEventType as CopyStreamEvent['event'],
              ...data,
            });
          } catch {
            // Incomplete JSON, put back in buffer
            buffer = lines.slice(i).join('\n');
            break;
          }
          currentEventType = '';
        } else if (line === '' && currentEventType === '') {
          // Empty line between events, skip
        } else if (line !== '') {
          // Incomplete line, put back in buffer
          buffer = lines.slice(i).join('\n');
          break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return savedRecords;
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
