/**
 * Higgsfield API: AI images and short videos.
 *
 * Requests are asynchronous: submit to a model, keep the request id, then
 * check its status until it's completed (or failed, or blocked as nsfw).
 * Higgsfield only charges for completed requests, and keeps results for at
 * least 7 days, so finished files are copied into Zetca's own storage.
 */

import { getConfig } from '../config';
import { httpGet, type HttpResponse } from './stockPhotoService';
import { request } from 'https';

const BASE = 'https://api.higgsfield.ai';

export type HiggsfieldStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw' | 'canceled';

export interface HiggsfieldRequest {
  status: HiggsfieldStatus;
  request_id: string;
  error?: string | null;
  images?: { url: string }[];
  video?: { url: string };
}

export class HiggsfieldError extends Error {
  constructor(message: string, public statusCode = 502) {
    super(message);
    this.name = 'HiggsfieldError';
  }
}

function postJson(url: string, body: unknown, headers: Record<string, string>, timeoutMs: number): Promise<HttpResponse> {
  const data = Buffer.from(JSON.stringify(body));
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': String(data.length), ...headers } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timed out')));
    req.on('error', reject);
    req.end(data);
  });
}

export interface HiggsfieldTransport {
  post: (url: string, body: unknown, headers: Record<string, string>) => Promise<HttpResponse>;
  get: (url: string, headers: Record<string, string>) => Promise<HttpResponse>;
}

const defaultTransport: HiggsfieldTransport = {
  post: (url, body, headers) => postJson(url, body, headers, 20_000),
  get: (url, headers) => getWithHeaders(url, headers, 20_000),
};

function getWithHeaders(url: string, headers: Record<string, string>, timeoutMs: number): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: 'GET', headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timed out')));
    req.on('error', reject);
    req.end();
  });
}

export class HiggsfieldClient {
  constructor(private transport: HiggsfieldTransport = defaultTransport) {}

  private auth(): Record<string, string> {
    // The key is "<key id>:<secret>", as Higgsfield's console gives it
    const key = getConfig().higgsfieldApiKey;
    if (!key) throw new HiggsfieldError('AI images aren’t set up yet', 503);
    return { Authorization: `Key ${key}` };
  }

  private parse(res: HttpResponse, what: string): HiggsfieldRequest {
    let body: unknown;
    try {
      body = JSON.parse(res.body.toString('utf8'));
    } catch {
      body = null;
    }
    const detail = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : undefined;
    if (detail === 'not_enough_credits' || res.status === 402) {
      console.error('Higgsfield balance is empty: top up at cloud.higgsfield.ai');
      throw new HiggsfieldError('AI images are paused right now. Text designs and stock photos still work.', 503);
    }
    if (res.status === 401 || res.status === 403) throw new HiggsfieldError('The AI service rejected Zetca’s key', 502);
    if (res.status === 402) throw new HiggsfieldError('The AI service is out of balance. Try again later.', 503);
    if (res.status === 429) throw new HiggsfieldError('The AI service is busy. Try again in a minute.', 429);
    if (res.status < 200 || res.status >= 300 || !body || typeof body !== 'object') {
      console.error(`Higgsfield ${what} failed (${res.status}):`, res.body.toString('utf8').slice(0, 300));
      throw new HiggsfieldError('The AI service couldn’t do that right now. Please try again.');
    }
    return body as HiggsfieldRequest;
  }

  /** Starts a request on a model's endpoint; `idempotencyKey` makes a retried submit safe */
  async submit(endpoint: string, body: Record<string, unknown>, idempotencyKey: string): Promise<HiggsfieldRequest> {
    const prompt = typeof body.prompt === 'string' ? body.prompt.slice(0, 1500) : body.prompt;
    const res = await this.transport.post(`${BASE}/${endpoint}`, { ...body, prompt }, { ...this.auth(), 'Idempotency-Key': idempotencyKey });
    return this.parse(res, `${endpoint} submit`);
  }

  async status(requestId: string): Promise<HiggsfieldRequest> {
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new HiggsfieldError('Unknown request', 404);
    const res = await this.transport.get(`${BASE}/requests/${requestId}/status`, this.auth());
    return this.parse(res, 'status');
  }

  /** Downloads a finished file from Higgsfield's CDN */
  async download(url: string): Promise<Buffer> {
    if (!/^https:\/\//.test(url)) throw new HiggsfieldError('Unexpected file address');
    const res = await httpGet(url, 60_000);
    if (res.status !== 200 || !res.body.length) throw new HiggsfieldError('Couldn’t fetch the AI result. Please try again.');
    return res.body;
  }
}
