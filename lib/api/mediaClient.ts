/**
 * API Client for Media operations
 * Handles presigned URL generation, S3 uploads, and media CRUD
 */

export class MediaAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MediaAPIError';
  }
}

interface UploadUrlResponse {
  uploadUrl: string;
  mediaId: string;
  s3Key: string;
}

interface DownloadUrlResponse {
  downloadUrl: string;
  mediaId: string;
  contentType: string;
  mediaType: 'image' | 'video';
}

interface ValidateMediaResponse {
  valid: boolean;
  mediaId: string;
  mediaType: 'image' | 'video';
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function createAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function handleAuthError(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}

/**
 * Request a presigned upload URL from the media API
 */
export async function requestUploadUrl(
  contentType: string,
  filename: string,
  fileSize: number
): Promise<UploadUrlResponse> {
  try {
    const response = await fetch('/api/media/upload-url', {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ contentType, filename, fileSize }),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new MediaAPIError('Authentication required. Please log in again.', 401);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new MediaAPIError(
        errorData.error || `Failed to request upload URL: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MediaAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new MediaAPIError('Network error: Unable to connect to the media service.', undefined, error);
    }
    throw new MediaAPIError('An unexpected error occurred while requesting upload URL', undefined, error);
  }
}

/**
 * Upload a file directly to S3 using a presigned URL
 */
export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    if (!response.ok) {
      throw new MediaAPIError(`S3 upload failed: ${response.statusText}`, response.status);
    }
  } catch (error) {
    if (error instanceof MediaAPIError) throw error;
    throw new MediaAPIError('Failed to upload file to storage', undefined, error);
  }
}

/**
 * Request a presigned download URL for a media file
 */
export async function getDownloadUrl(mediaId: string): Promise<DownloadUrlResponse> {
  try {
    const response = await fetch(`/api/media/${mediaId}/download-url`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new MediaAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new MediaAPIError('Access denied.', 403);
    }
    if (response.status === 404) {
      throw new MediaAPIError('Media not found.', 404);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new MediaAPIError(
        errorData.error || `Failed to get download URL: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MediaAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new MediaAPIError('Network error: Unable to connect to the media service.', undefined, error);
    }
    throw new MediaAPIError('An unexpected error occurred while getting download URL', undefined, error);
  }
}

/**
 * Delete a media file
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  try {
    const response = await fetch(`/api/media/${mediaId}`, {
      method: 'DELETE',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new MediaAPIError('Authentication required. Please log in again.', 401);
    }
    if (response.status === 403) {
      throw new MediaAPIError('Access denied.', 403);
    }
    if (response.status === 404) {
      throw new MediaAPIError('Media not found.', 404);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new MediaAPIError(
        errorData.error || `Failed to delete media: ${response.statusText}`,
        response.status,
        errorData
      );
    }
  } catch (error) {
    if (error instanceof MediaAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new MediaAPIError('Network error: Unable to connect to the media service.', undefined, error);
    }
    throw new MediaAPIError('An unexpected error occurred while deleting media', undefined, error);
  }
}

/**
 * Validate that a media file exists and belongs to the current user
 */
export async function validateMedia(mediaId: string): Promise<ValidateMediaResponse> {
  try {
    const response = await fetch(`/api/media/${mediaId}/validate`, {
      method: 'POST',
      headers: createAuthHeaders(),
    });

    if (response.status === 401) {
      handleAuthError();
      throw new MediaAPIError('Authentication required. Please log in again.', 401);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new MediaAPIError(
        errorData.error || `Failed to validate media: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MediaAPIError) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new MediaAPIError('Network error: Unable to connect to the media service.', undefined, error);
    }
    throw new MediaAPIError('An unexpected error occurred while validating media', undefined, error);
  }
}
