/**
 * LinkedIn API client for publishing posts and uploading images.
 *
 * Encapsulates all LinkedIn REST API interactions including post creation,
 * image upload initialization, image binary upload, and error handling.
 */

import { LinkedInPostResponse, LinkedInImageUploadResponse } from '../models/publisher';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/rest';
const LINKEDIN_VERSION = '202603';
const RESTLI_PROTOCOL_VERSION = '2.0.0';

const ERROR_CODE_MAP: Record<number, string> = {
  400: 'validation_error',
  401: 'token_expired',
  403: 'access_denied',
  429: 'rate_limited',
  500: 'linkedin_server_error',
  503: 'linkedin_server_error',
};

/** fetch that gives up after `ms` (aborting the request), so one hung call can't stall the publisher */
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class LinkedInClient {
  constructor(private timeoutSeconds: number = 30) {}

  private headers(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Linkedin-Version': LINKEDIN_VERSION,
      'X-Restli-Protocol-Version': RESTLI_PROTOCOL_VERSION,
      'Content-Type': 'application/json',
    };
  }

  /** Combine post content with hashtags into commentary text. Prefixes each hashtag with '#' if needed. */
  formatCommentary(content: string, hashtags: string[]): string {
    if (!hashtags.length) return content;
    const formatted = hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
    return `${content} ${formatted.join(' ')}`;
  }

  private mapError(statusCode: number, responseText: string): LinkedInPostResponse {
    return {
      status_code: statusCode,
      error_code: ERROR_CODE_MAP[statusCode] || 'linkedin_server_error',
      error_message: responseText ? responseText.slice(0, 500) : `HTTP ${statusCode}`,
    };
  }

  private buildPostBody(personUrn: string, commentary: string, imageUrn?: string): Record<string, unknown> {
    const body: Record<string, unknown> = {
      author: personUrn,
      commentary,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
    if (imageUrn) body.content = { media: { id: imageUrn } };
    return body;
  }

  private fetchTimeoutMs(): number {
    return this.timeoutSeconds * 1000;
  }

  /** POST /rest/posts — creates a text-only post. */
  async createTextPost(accessToken: string, personUrn: string, commentary: string): Promise<LinkedInPostResponse> {
    const url = `${LINKEDIN_API_BASE}/posts`;
    const body = this.buildPostBody(personUrn, commentary);

    try {
      const response = await fetchWithTimeout(url, { method: 'POST', headers: this.headers(accessToken), body: JSON.stringify(body) },
        this.fetchTimeoutMs()
      );

      if (response.status === 201) {
        return { status_code: 201, post_id: response.headers.get('x-restli-id') };
      }
      return this.mapError(response.status, await response.text());
    } catch (e) {
      return { status_code: 0, error_code: 'network_error', error_message: `Network error: ${(e as Error)?.message ?? e}` };
    }
  }

  /** POST /rest/images?action=initializeUpload — returns upload URL and image URN. */
  async initializeImageUpload(accessToken: string, personUrn: string): Promise<LinkedInImageUploadResponse> {
    const url = `${LINKEDIN_API_BASE}/images?action=initializeUpload`;
    const body = { initializeUploadRequest: { owner: personUrn } };

    let response: Response;
    try {
      response = await fetchWithTimeout(url, { method: 'POST', headers: this.headers(accessToken), body: JSON.stringify(body) },
        this.fetchTimeoutMs()
      );
    } catch (e) {
      throw new Error(`Network error initializing image upload: ${(e as Error)?.message ?? e}`);
    }

    if (response.status === 200 || response.status === 201) {
      const data = await response.json();
      const value = data.value || {};
      return { upload_url: value.uploadUrl, image_urn: value.image };
    }

    const text = await response.text();
    throw new Error(`Image upload init failed with status ${response.status}: ${text.slice(0, 500)}`);
  }

  /** PUT the raw image bytes to the upload URL. Returns the HTTP status code. */
  async uploadImageBinary(uploadUrl: string, imageData: Uint8Array | Buffer, contentType: string): Promise<number> {
    let response: Response;
    try {
      response = await fetchWithTimeout(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          // Buffer is structurally a Uint8Array at runtime; cast past the DOM lib's
          // stricter BodyInit typing (a known TS/Node fetch-typing mismatch).
          body: imageData as unknown as BodyInit,
        },
        this.fetchTimeoutMs()
      );
    } catch (e) {
      throw new Error(`Network error uploading image binary: ${(e as Error)?.message ?? e}`);
    }

    if (response.status !== 200 && response.status !== 201) {
      const text = await response.text();
      throw new Error(`Image binary upload failed with status ${response.status}: ${text.slice(0, 500)}`);
    }
    return response.status;
  }

  /** POST /rest/posts with a given content block (document, multi-image) */
  private async createPostWithContent(accessToken: string, personUrn: string, commentary: string, content: Record<string, unknown>): Promise<LinkedInPostResponse> {
    const body = { ...this.buildPostBody(personUrn, commentary), content };
    try {
      const response = await fetchWithTimeout(`${LINKEDIN_API_BASE}/posts`, { method: 'POST', headers: this.headers(accessToken), body: JSON.stringify(body) }, this.fetchTimeoutMs());
      if (response.status === 201) return { status_code: 201, post_id: response.headers.get('x-restli-id') };
      return this.mapError(response.status, await response.text());
    } catch (e) {
      return { status_code: 0, error_code: 'network_error', error_message: `Network error: ${(e as Error)?.message ?? e}` };
    }
  }

  /**
   * POST /rest/documents?action=initializeUpload: where to upload a PDF, and
   * its document URN. Throws with `.status` set, so a 403 (not allowed for
   * this app) can fall back to a multi-image post.
   */
  async initializeDocumentUpload(accessToken: string, personUrn: string): Promise<{ upload_url: string; document_urn: string }> {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${LINKEDIN_API_BASE}/documents?action=initializeUpload`,
        { method: 'POST', headers: this.headers(accessToken), body: JSON.stringify({ initializeUploadRequest: { owner: personUrn } }) },
        this.fetchTimeoutMs()
      );
    } catch (e) {
      throw Object.assign(new Error(`Network error initializing document upload: ${(e as Error)?.message ?? e}`), { status: 0 });
    }
    if (response.status === 200 || response.status === 201) {
      const value = (await response.json()).value || {};
      return { upload_url: value.uploadUrl, document_urn: value.document };
    }
    const text = await response.text();
    throw Object.assign(new Error(`Document upload init failed with status ${response.status}: ${text.slice(0, 500)}`), { status: response.status });
  }

  /** PUT the PDF bytes to the document upload URL */
  async uploadDocument(accessToken: string, uploadUrl: string, pdf: Buffer): Promise<void> {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        uploadUrl,
        { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream' }, body: pdf as unknown as BodyInit },
        this.fetchTimeoutMs() * 2
      );
    } catch (e) {
      throw new Error(`Network error uploading the document: ${(e as Error)?.message ?? e}`);
    }
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Document upload failed with status ${response.status}: ${(await response.text()).slice(0, 500)}`);
    }
  }

  /** GET /rest/documents/{urn}: PROCESSING, AVAILABLE or PROCESSING_FAILED */
  async documentStatus(accessToken: string, documentUrn: string): Promise<string> {
    const response = await fetchWithTimeout(`${LINKEDIN_API_BASE}/documents/${encodeURIComponent(documentUrn)}`, { method: 'GET', headers: this.headers(accessToken) }, this.fetchTimeoutMs());
    if (!response.ok) return `HTTP_${response.status}`;
    return String((await response.json()).status ?? 'UNKNOWN');
  }

  /** A post with a PDF: LinkedIn shows it as a swipeable carousel with `title` above it */
  createDocumentPost(accessToken: string, personUrn: string, commentary: string, documentUrn: string, title: string): Promise<LinkedInPostResponse> {
    return this.createPostWithContent(accessToken, personUrn, commentary, { media: { title, id: documentUrn } });
  }

  /** A post with 2-20 images, shown as a grid */
  createMultiImagePost(accessToken: string, personUrn: string, commentary: string, imageUrns: string[], altTexts: string[] = []): Promise<LinkedInPostResponse> {
    return this.createPostWithContent(accessToken, personUrn, commentary, {
      multiImage: { images: imageUrns.map((id, i) => ({ id, ...(altTexts[i] ? { altText: altTexts[i] } : {}) })) },
    });
  }

  /** POST /rest/posts with a content.media.id — creates a post with an image attachment. */
  async createImagePost(
    accessToken: string,
    personUrn: string,
    commentary: string,
    imageUrn: string
  ): Promise<LinkedInPostResponse> {
    const url = `${LINKEDIN_API_BASE}/posts`;
    const body = this.buildPostBody(personUrn, commentary, imageUrn);

    try {
      const response = await fetchWithTimeout(url, { method: 'POST', headers: this.headers(accessToken), body: JSON.stringify(body) },
        this.fetchTimeoutMs()
      );

      if (response.status === 201) {
        return { status_code: 201, post_id: response.headers.get('x-restli-id') };
      }
      return this.mapError(response.status, await response.text());
    } catch (e) {
      return { status_code: 0, error_code: 'network_error', error_message: `Network error: ${(e as Error)?.message ?? e}` };
    }
  }
}
