/**
 * @jest-environment node
 */
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { AiCredits, OutOfCreditsError, monthOf } from '@/lib/services/aiCredits';
import { AiDesignService, imagePrompt } from '@/lib/services/aiDesignService';
import { HiggsfieldClient, HiggsfieldError } from '@/lib/services/higgsfieldClient';
import { VideoDesignService } from '@/lib/services/videoDesignService';

/** A tiny in-memory stand-in for the users table, enough for the credit updates */
function fakeUsersTable(initial: Record<string, number | string> = {}) {
  const row: Record<string, number | string> = { userId: 'u1', ...initial };
  const send = jest.fn(async (cmd: { input: Record<string, unknown>; constructor: { name: string } }) => {
    const input = cmd.input as { UpdateExpression?: string; ExpressionAttributeValues?: Record<string, number | string>; ConditionExpression?: string };
    if (cmd.constructor.name === 'GetCommand') return { Item: { ...row } };
    const v = input.ExpressionAttributeValues!;
    const expr = input.UpdateExpression!;
    if (expr.startsWith('ADD aiCreditsUsed :cost')) {
      if (row.aiCreditsMonth !== v[':month'] || (row.aiCreditsUsed as number) > (v[':max'] as number)) throw new ConditionalCheckFailedException({ message: 'no', $metadata: {} });
      row.aiCreditsUsed = (row.aiCreditsUsed as number) + (v[':cost'] as number);
      return { Attributes: { ...row } };
    }
    if (expr.startsWith('SET aiCreditsMonth')) {
      if (row.aiCreditsMonth === v[':month']) throw new ConditionalCheckFailedException({ message: 'no', $metadata: {} });
      row.aiCreditsMonth = v[':month'];
      row.aiCreditsUsed = v[':cost'];
      return {};
    }
    if (expr.startsWith('ADD aiCreditsUsed :minus')) {
      if (row.aiCreditsMonth !== v[':month'] || (row.aiCreditsUsed as number) < (v[':cost'] as number)) throw new ConditionalCheckFailedException({ message: 'no', $metadata: {} });
      row.aiCreditsUsed = (row.aiCreditsUsed as number) + (v[':minus'] as number);
      return {};
    }
    throw new Error(`unexpected ${expr}`);
  });
  return { row, doc: { send } as never };
}

describe('AI credits', () => {
  beforeEach(() => {
    process.env.AI_CREDITS_PER_MONTH = '10';
  });

  it('starts each month at zero, then counts up', async () => {
    const t = fakeUsersTable({ aiCreditsMonth: '2000-01', aiCreditsUsed: 9 });
    const credits = new AiCredits(t.doc);
    expect((await credits.get('u1')).left).toBe(10);
    expect((await credits.take('u1', 5)).left).toBe(5);
    expect((await credits.take('u1', 1)).left).toBe(4);
    expect(t.row).toMatchObject({ aiCreditsMonth: monthOf(), aiCreditsUsed: 6 });
  });

  it('refuses when there aren’t enough left', async () => {
    const t = fakeUsersTable({ aiCreditsMonth: monthOf(), aiCreditsUsed: 8 });
    await expect(new AiCredits(t.doc).take('u1', 5)).rejects.toBeInstanceOf(OutOfCreditsError);
    expect(t.row.aiCreditsUsed).toBe(8);
  });

  it('gives credits back, but only in the month they were taken', async () => {
    const t = fakeUsersTable({ aiCreditsMonth: monthOf(), aiCreditsUsed: 6 });
    const credits = new AiCredits(t.doc);
    await credits.refund('u1', 5, monthOf());
    expect(t.row.aiCreditsUsed).toBe(1);
    await credits.refund('u1', 1, '2000-01');
    expect(t.row.aiCreditsUsed).toBe(1);
  });
});

describe('Higgsfield client', () => {
  const ok = (body: unknown) => ({ status: 200, body: Buffer.from(JSON.stringify(body)) });

  beforeEach(() => {
    process.env.HIGGSFIELD_API_KEY = 'kid:secret';
  });

  it('sends the key and asks for an image in the right shape', async () => {
    const post = jest.fn(async () => ok({ status: 'queued', request_id: 'r1' }));
    await new HiggsfieldClient({ post, get: jest.fn() }).submitImage('A lake', '9:16', 'job-image');
    const [url, body, headers] = post.mock.calls[0] as unknown as [string, Record<string, string>, Record<string, string>];
    expect(url).toBe('https://api.higgsfield.ai/higgsfield-ai/soul/standard');
    expect(body).toMatchObject({ prompt: 'A lake', aspect_ratio: '9:16', resolution: '1080p' });
    expect(headers).toMatchObject({ Authorization: 'Key kid:secret', 'Idempotency-Key': 'job-image' });
  });

  it('explains an empty Higgsfield balance without blaming the user', async () => {
    const post = jest.fn(async () => ({ status: 403, body: Buffer.from(JSON.stringify({ detail: 'not_enough_credits' })) }));
    await expect(new HiggsfieldClient({ post, get: jest.fn() }).submitImage('x', '1:1', 'k')).rejects.toThrow('AI images are paused right now');
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
      submitImage: jest.fn(async () => ({ status: 'queued', request_id: 'img-req' })),
      submitVideo: jest.fn(async () => ({ status: 'queued', request_id: 'vid-req' })),
      status: jest.fn(async () => statuses.shift()),
      download: jest.fn(async () => Buffer.from('file')),
    };
    const credits = { take: jest.fn(async () => ({})), refund: jest.fn(async () => undefined) };
    const media = { createMedia: jest.fn(async (r: unknown) => r) };
    const service = new AiDesignService(hf as never, credits as never, s3 as never, media as never);
    return { service, hf, credits, media, files };
  }

  it('makes an image, copies it into storage and finishes', async () => {
    const t = setup([{ status: 'in_progress' }, { status: 'completed', images: [{ url: 'https://cdn.higgsfield.ai/a.jpg' }] }]);
    const job = await t.service.start('u1', { kind: 'image', prompt: 'A lake at dawn', format: 'portrait' });
    expect(t.credits.take).toHaveBeenCalledWith('u1', 1);
    expect(t.hf.submitImage).toHaveBeenCalledWith(imagePrompt('A lake at dawn'), '3:4', `${job.jobId}-image`);
    expect((await t.service.advance('u1', job.jobId)).stage).toBe('image');
    const done = await t.service.advance('u1', job.jobId);
    expect(done.stage).toBe('done');
    expect([...t.files.keys()]).toContain(`designs/u1/photos/${done.photoId}.jpg`);
  });

  it('animates the image for a video and saves the clip to the user’s media', async () => {
    const t = setup([
      { status: 'completed', images: [{ url: 'https://cdn.higgsfield.ai/a.jpg' }] },
      { status: 'completed', video: { url: 'https://cdn.higgsfield.ai/v.mp4' } },
    ]);
    const job = await t.service.start('u1', { kind: 'video', prompt: 'A runner', format: 'story' });
    expect(t.credits.take).toHaveBeenCalledWith('u1', 5);
    const mid = await t.service.advance('u1', job.jobId);
    expect(mid.stage).toBe('video');
    expect(t.hf.submitVideo).toHaveBeenCalledWith(expect.stringContaining('A runner'), 'https://cdn.higgsfield.ai/a.jpg', `${job.jobId}-video`);
    const done = await t.service.advance('u1', job.jobId);
    expect(done).toMatchObject({ stage: 'done', mediaId: expect.any(String) });
    expect(t.media.createMedia).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', mediaType: 'video', contentType: 'video/mp4' }));
  });

  it('gives the credits back when the safety check blocks it', async () => {
    const t = setup([{ status: 'nsfw' }]);
    const job = await t.service.start('u1', { kind: 'image', prompt: 'x', format: 'square' });
    const failed = await t.service.advance('u1', job.jobId);
    expect(failed).toMatchObject({ stage: 'failed', error: expect.stringContaining('safety check') });
    expect(t.credits.refund).toHaveBeenCalledWith('u1', 1, monthOf());
  });

  it('gives the credits back when the request can’t be started', async () => {
    const t = setup([]);
    t.hf.submitImage.mockRejectedValueOnce(new HiggsfieldError('busy', 429));
    await expect(t.service.start('u1', { kind: 'video', prompt: 'x', format: 'story' })).rejects.toThrow('busy');
    expect(t.credits.refund).toHaveBeenCalledWith('u1', 5, monthOf());
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
