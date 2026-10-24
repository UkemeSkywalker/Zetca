/**
 * @jest-environment node
 */
import { monthOf } from '@/lib/billing/credits';
import { memoryBilling } from '@/lib/billing/testing';
import { AiDesignService, imagePrompt } from '@/lib/services/aiDesignService';
import { HiggsfieldClient, HiggsfieldError } from '@/lib/services/higgsfieldClient';
import { VideoDesignService } from '@/lib/services/videoDesignService';

describe('Higgsfield client', () => {
  const ok = (body: unknown) => ({ status: 200, body: Buffer.from(JSON.stringify(body)) });

  beforeEach(() => {
    process.env.HIGGSFIELD_API_KEY = 'kid:secret';
  });

  it('sends the key and the model’s request to its endpoint', async () => {
    const post = jest.fn(async () => ok({ status: 'queued', request_id: 'r1' }));
    await new HiggsfieldClient({ post, get: jest.fn() }).submit('higgsfield-ai/soul/v2/standard', { prompt: 'A lake', aspect_ratio: '9:16', resolution: '1080p' }, 'job-image');
    const [url, body, headers] = post.mock.calls[0] as unknown as [string, Record<string, string>, Record<string, string>];
    expect(url).toBe('https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard');
    expect(body).toMatchObject({ prompt: 'A lake', aspect_ratio: '9:16', resolution: '1080p' });
    expect(headers).toMatchObject({ Authorization: 'Key kid:secret', 'Idempotency-Key': 'job-image' });
  });

  it('explains an empty Higgsfield balance without blaming the user', async () => {
    const post = jest.fn(async () => ({ status: 403, body: Buffer.from(JSON.stringify({ detail: 'not_enough_credits' })) }));
    await expect(new HiggsfieldClient({ post, get: jest.fn() }).submit('higgsfield-ai/soul/v2/standard', { prompt: 'x' }, 'k')).rejects.toThrow('AI images are paused right now');
  });

  it('says AI isn’t set up when there’s no key', async () => {
    process.env.HIGGSFIELD_API_KEY = '';
    await expect(new HiggsfieldClient({ post: jest.fn(), get: jest.fn() }).status('d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff')).rejects.toBeInstanceOf(HiggsfieldError);
  });
});

describe('AI jobs', () => {
  function setup(statuses: Record<string, unknown>[]) {
    const files = new Map<string, unknown>();
    const s3 = {
      send: jest.fn(async (cmd: { constructor: { name: string }; input: { Key: string; Body?: unknown } }) => {
        if (cmd.constructor.name === 'PutObjectCommand') {
          files.set(cmd.input.Key, cmd.input.Body);
          return {};
        }
        const body = files.get(cmd.input.Key);
        if (body === undefined) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
        return { Body: { transformToString: async () => String(body) } };
      }),
    };
    const hf = {
      submit: jest.fn(async (endpoint: string) => ({ status: 'queued', request_id: endpoint.includes('video') ? 'vid-req' : 'img-req' })),
      status: jest.fn(async () => statuses.shift()),
      download: jest.fn(async () => Buffer.from('file')),
    };
    const billing = memoryBilling('agency');
    const credits = { take: jest.fn(billing.credits.take), refund: jest.fn(billing.credits.refund) };
    const media = { createMedia: jest.fn(async (r: unknown) => r) };
    const checkPlan = jest.fn(async () => undefined);
    const service = new AiDesignService(hf as never, credits as never, s3 as never, media as never, billing.ledger, checkPlan);
    return { service, hf, credits, media, files, billing, checkPlan };
  }

  it('makes an image, copies it into storage and finishes', async () => {
    const t = setup([{ status: 'in_progress' }, { status: 'completed', images: [{ url: 'https://cdn.higgsfield.ai/a.jpg' }] }]);
    const job = await t.service.start('u1', { kind: 'image', prompt: 'A lake at dawn', format: 'portrait' });
    expect(t.credits.take).toHaveBeenCalledWith('u1', 1);
    expect(job.model).toBe('soul-v2');
    expect(t.hf.submit).toHaveBeenCalledWith('higgsfield-ai/soul/v2/standard', { prompt: imagePrompt('A lake at dawn'), aspect_ratio: '3:4', resolution: '1080p' }, `${job.jobId}-image`);
    expect((await t.service.advance('u1', job.jobId)).stage).toBe('image');
    const done = await t.service.advance('u1', job.jobId);
    expect(done.stage).toBe('done');
    expect([...t.files.keys()]).toContain(`designs/u1/photos/${done.photoId}.jpg`);
    expect(t.billing.entries.at(-1)).toMatchObject({ action: 'ai_image', credits: 1, detail: 'soul-v2', costUsd: 0.006, status: 'charged' });
  });

  it('animates the image for a video and saves the clip to the user’s media', async () => {
    const t = setup([
      { status: 'completed', images: [{ url: 'https://cdn.higgsfield.ai/a.jpg' }] },
      { status: 'completed', video: { url: 'https://cdn.higgsfield.ai/v.mp4' } },
    ]);
    const job = await t.service.start('u1', { kind: 'video', prompt: 'A runner', format: 'story', model: 'kling-2-5-turbo' });
    expect(t.credits.take).toHaveBeenCalledWith('u1', 26);
    const mid = await t.service.advance('u1', job.jobId);
    expect(mid.stage).toBe('video');
    expect(t.hf.submit).toHaveBeenLastCalledWith(
      'kling-video/v2.5-turbo/standard/image-to-video',
      { prompt: expect.stringContaining('A runner'), image_url: 'https://cdn.higgsfield.ai/a.jpg', duration: 5 },
      `${job.jobId}-video`
    );
    const done = await t.service.advance('u1', job.jobId);
    expect(done).toMatchObject({ stage: 'done', mediaId: expect.any(String) });
    expect(t.media.createMedia).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', mediaType: 'video', contentType: 'video/mp4' }));
  });

  it('gives the credits back when the safety check blocks it', async () => {
    const t = setup([{ status: 'nsfw' }]);
    const job = await t.service.start('u1', { kind: 'image', prompt: 'x', format: 'square' });
    const failed = await t.service.advance('u1', job.jobId);
    expect(failed).toMatchObject({ stage: 'failed', error: expect.stringContaining('safety check') });
    expect(t.credits.refund).toHaveBeenCalledWith('u1', 1, 'monthly', monthOf());
  });

  it('gives the credits back when the request can’t be started', async () => {
    const t = setup([]);
    t.hf.submit.mockRejectedValueOnce(new HiggsfieldError('busy', 429));
    await expect(t.service.start('u1', { kind: 'video', prompt: 'x', format: 'story' })).rejects.toThrow('busy');
    expect(t.credits.refund).toHaveBeenCalledWith('u1', 26, 'monthly', monthOf());
  });

  it('won’t show another user’s job', async () => {
    const t = setup([]);
    const job = await t.service.start('u1', { kind: 'image', prompt: 'x', format: 'square' });
    await expect(t.service.advance('u2', job.jobId)).rejects.toThrow('doesn’t exist');
  });
});

describe('video with words on top', () => {
  it('only uses the user’s own files', async () => {
    const media = {
      getMediaById: jest.fn(async (id: string) =>
        id === 'v' ? { mediaId: 'v', userId: 'u1', mediaType: 'video', s3Key: 'u1/v/a.mp4' } : { mediaId: id, userId: 'u2', mediaType: 'image', s3Key: 'x' }
      ),
      createMedia: jest.fn(),
    };
    const service = new VideoDesignService(media as never, { send: jest.fn() } as never, jest.fn());
    await expect(service.render('u1', { videoMediaId: 'v', overlayMediaId: 'o', format: 'story' })).rejects.toThrow('isn’t yours');
  });
});
