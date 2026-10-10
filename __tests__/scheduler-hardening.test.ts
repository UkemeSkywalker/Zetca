/**
 * @jest-environment node
 */

import { PublisherService, MAX_PUBLISH_ATTEMPTS, STUCK_PUBLISHING_MS } from '@/lib/services/publisherService';
import { SchedulerService, type SchedulerAgentLike } from '@/lib/services/schedulerService';
import { SchedulerRepository, type PostUpdates } from '@/lib/db/schedulerRepository';
import { LinkedInClient } from '@/lib/services/linkedinClient';
import type { PublisherRepository } from '@/lib/db/publisherRepository';
import type { UserRepository } from '@/lib/db/userRepository';
import type { MediaRepository } from '@/lib/db/mediaRepository';
import type { CopyRepository } from '@/lib/db/copyRepository';
import type { StrategyRepository } from '@/lib/db/strategyRepository';
import { newScheduledPostRecord, type PostStatus, type ScheduledPostRecord } from '@/lib/models/scheduler';
import type { PublishLogRecord, LinkedInPostResponse } from '@/lib/models/publisher';
import type { CopyRecord } from '@/lib/models/copy';
import type { StrategyRecord } from '@/lib/models/strategy';

const HOUR = 60 * 60_000;
const slot = (ms: number) => ({ date: new Date(ms).toISOString().slice(0, 10), time: new Date(ms).toISOString().slice(11, 16) });

function post(overrides: Partial<ScheduledPostRecord> = {}): ScheduledPostRecord {
  const due = slot(Date.now() - 60_000);
  return {
    ...newScheduledPostRecord({
      strategy_id: 's1',
      copy_id: 'c1',
      user_id: 'u1',
      content: 'Hello LinkedIn',
      platform: 'linkedin',
      scheduled_date: due.date,
      scheduled_time: due.time,
      status: 'scheduled',
    }),
    ...overrides,
  };
}

/** In-memory scheduled-posts table with the same claim/condition rules as the real repository */
function makePostsRepo(initial: ScheduledPostRecord[] = []) {
  const posts = new Map(initial.map((p) => [p.id, { ...p }]));
  let failNextUpdates = 0;
  const repo = {
    posts,
    failUpdates: (n: number) => (failNextUpdates = n),
    getPostById: async (id: string, userId?: string) => {
      const p = posts.get(id);
      return p && (userId === undefined || p.user_id === userId) ? { ...p } : null;
    },
    postExists: async (id: string) => posts.has(id),
    listPostsByUser: async (userId: string) => [...posts.values()].filter((p) => p.user_id === userId),
    createPost: async (p: ScheduledPostRecord) => (posts.set(p.id, { ...p }), p),
    createPosts: async (list: ScheduledPostRecord[]) => (list.forEach((p) => posts.set(p.id, { ...p })), list),
    updatePost: async (id: string, updates: PostUpdates, { expectedStatus }: { expectedStatus?: PostStatus | PostStatus[] } = {}) => {
      if (failNextUpdates > 0) {
        failNextUpdates--;
        throw new Error('network blip');
      }
      const p = posts.get(id);
      const allowed = expectedStatus === undefined ? null : Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
      if (!p || (allowed && !allowed.includes(p.status))) return null;
      for (const [k, v] of Object.entries(updates)) (p as Record<string, unknown>)[k] = v;
      return { ...p };
    },
    claimPost: async (id: string, { manual = false } = {}) => {
      const p = posts.get(id);
      const now = new Date().toISOString();
      const ok = manual
        ? p && ['scheduled', 'draft', 'failed'].includes(p.status)
        : p && p.status === 'scheduled' && (!p.next_attempt_at || p.next_attempt_at <= now);
      if (!ok) return null;
      Object.assign(p!, { status: 'publishing', claimed_at: now, publish_attempts: (p!.publish_attempts ?? 0) + 1 });
      return { ...p! };
    },
    findDuePosts: async (now: string) =>
      [...posts.values()].filter((p) => p.status === 'scheduled' && (p.due_at ?? '') <= now).map((p) => ({ ...p })),
    findStuckPublishing: async (before: string) =>
      [...posts.values()].filter((p) => p.status === 'publishing' && (!p.claimed_at || p.claimed_at < before)),
    findScheduledWithoutDueAt: async () => [],
  };
  return repo;
}

function makePublisher({
  posts = [] as ScheduledPostRecord[],
  linkedin = [{ status_code: 201, post_id: 'li-1' }] as LinkedInPostResponse[],
  connected = true,
  mediaOwner = 'u1',
} = {}) {
  const repo = makePostsRepo(posts);
  const logs: PublishLogRecord[] = [];
  let call = 0;
  const createTextPost = jest.fn(async () => {
    // A tick of real async, so two scans can interleave
    await new Promise((resolve) => setTimeout(resolve, 5));
    return linkedin[Math.min(call++, linkedin.length - 1)];
  });
  const linkedinClient = {
    formatCommentary: (c: string) => c,
    createTextPost,
    createImagePost: createTextPost,
    initializeImageUpload: jest.fn(async () => ({ upload_url: 'u', image_urn: 'i' })),
    uploadImageBinary: jest.fn(async () => 201),
  } as unknown as LinkedInClient;
  const publisherRepo = {
    createLog: async (l: PublishLogRecord) => (logs.push(l), l),
    listLogsByPost: async (id: string) => logs.filter((l) => l.post_id === id),
  } as unknown as PublisherRepository;
  const userRepo = {
    getUserLinkedInCredentials: async () => (connected ? { linkedinAccessToken: 't', linkedinSub: 'sub' } : {}),
  } as unknown as UserRepository;
  const mediaRepo = {
    getMediaById: async (id: string) => ({ mediaId: id, userId: mediaOwner, s3Key: 'k', contentType: 'image/png' }),
  } as unknown as MediaRepository;
  const service = new PublisherService(linkedinClient, publisherRepo, repo as unknown as SchedulerRepository, userRepo, mediaRepo, 'bucket');
  return { service, repo, logs, createTextPost };
}

describe('PublisherService', () => {
  it('publishes a due post once, even when two scans run at the same time', async () => {
    const p = post();
    const { service, repo, createTextPost, logs } = makePublisher({ posts: [p] });
    await Promise.all([service.runScanCycle(), service.runScanCycle()]);
    expect(createTextPost).toHaveBeenCalledTimes(1);
    expect(repo.posts.get(p.id)?.status).toBe('published');
    expect(logs.filter((l) => l.status === 'published')).toHaveLength(1);
  });

  it('reschedules a temporary failure with a delay, without retrying it straight away', async () => {
    const p = post();
    const { service, repo, createTextPost } = makePublisher({
      posts: [p],
      linkedin: [{ status_code: 503, error_code: 'linkedin_server_error', error_message: 'busy' }],
    });
    await service.runScanCycle();
    const after = repo.posts.get(p.id)!;
    expect(after.status).toBe('scheduled');
    expect(after.publish_attempts).toBe(1);
    expect(after.last_error_code).toBe('linkedin_server_error');
    expect(Date.parse(after.next_attempt_at!)).toBeGreaterThan(Date.now() + 30_000);

    await service.runScanCycle();
    expect(createTextPost).toHaveBeenCalledTimes(1);
  });

  it(`gives up after ${MAX_PUBLISH_ATTEMPTS} attempts`, async () => {
    const p = post({ publish_attempts: MAX_PUBLISH_ATTEMPTS - 1 });
    const { service, repo } = makePublisher({
      posts: [p],
      linkedin: [{ status_code: 0, error_code: 'network_error', error_message: 'timeout' }],
    });
    await service.runScanCycle();
    expect(repo.posts.get(p.id)?.status).toBe('failed');
    expect(repo.posts.get(p.id)?.last_error).toMatch(/after 5 tries/);
  });

  it('fails an expired LinkedIn sign-in straight away, with a message saying what to do', async () => {
    const p = post();
    const { service, repo } = makePublisher({ posts: [p], linkedin: [{ status_code: 401, error_code: 'token_expired' }] });
    await service.runScanCycle();
    expect(repo.posts.get(p.id)?.status).toBe('failed');
    expect(repo.posts.get(p.id)?.last_error).toMatch(/Reconnect LinkedIn/);
  });

  it('marks posts failed once when LinkedIn is not connected, instead of logging every scan', async () => {
    const p = post();
    const { service, repo, logs, createTextPost } = makePublisher({ posts: [p], connected: false });
    await service.runScanCycle();
    await service.runScanCycle();
    expect(createTextPost).not.toHaveBeenCalled();
    expect(repo.posts.get(p.id)?.status).toBe('failed');
    expect(logs).toHaveLength(1);
  });

  it('does not try to auto-publish platforms other than LinkedIn', async () => {
    const p = post({ platform: 'instagram' });
    const { service, repo, createTextPost } = makePublisher({ posts: [p] });
    await service.runScanCycle();
    expect(createTextPost).not.toHaveBeenCalled();
    expect(repo.posts.get(p.id)?.last_error_code).toBe('platform_not_supported');
    expect(repo.posts.get(p.id)?.status).toBe('failed');
  });

  it('retries saving "published" after a blip, without posting again', async () => {
    const p = post();
    const { service, repo, createTextPost } = makePublisher({ posts: [p] });
    repo.failUpdates(1);
    await service.runScanCycle();
    expect(createTextPost).toHaveBeenCalledTimes(1);
    expect(repo.posts.get(p.id)?.status).toBe('published');
  });

  it('settles posts left "publishing" from the log instead of posting them again', async () => {
    const claimedAt = new Date(Date.now() - STUCK_PUBLISHING_MS - 60_000).toISOString();
    const done = post({ status: 'publishing', claimed_at: claimedAt });
    const unknown = post({ status: 'publishing', claimed_at: claimedAt });
    const { service, repo, logs, createTextPost } = makePublisher({ posts: [done, unknown] });
    logs.push({ log_id: 'l', post_id: done.id, user_id: 'u1', platform: 'linkedin', status: 'published', attempted_at: new Date().toISOString() });

    await service.runScanCycle();
    expect(createTextPost).not.toHaveBeenCalled();
    expect(repo.posts.get(done.id)?.status).toBe('published');
    expect(repo.posts.get(unknown.id)?.status).toBe('failed');
    expect(repo.posts.get(unknown.id)?.last_error_code).toBe('publish_interrupted');
  });

  it("refuses to post someone else's image", async () => {
    const p = post({ media_id: 'm1' });
    const { service, repo, createTextPost } = makePublisher({ posts: [p], mediaOwner: 'someone-else' });
    await service.runScanCycle();
    expect(createTextPost).not.toHaveBeenCalled();
    expect(repo.posts.get(p.id)?.status).toBe('failed');
    expect(repo.posts.get(p.id)?.last_error_code).toBe('media_forbidden');
  });

  it('publish now: refuses a post being published or owned by someone else; keeps status on failure', async () => {
    const busy = post({ status: 'publishing' });
    const draft = post({ status: 'draft' });
    const { service, repo } = makePublisher({
      posts: [busy, draft],
      linkedin: [{ status_code: 503, error_code: 'linkedin_server_error' }],
    });
    await expect(service.publishNow(busy.id, 'u1')).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.publishNow(draft.id, 'intruder')).rejects.toMatchObject({ statusCode: 403 });
    const log = await service.publishNow(draft.id, 'u1');
    expect(log.status).toBe('failed');
    expect(repo.posts.get(draft.id)?.status).toBe('draft');
  });
});

// ---------------------------------------------------------------------------

function copy(id: string, jobId: string | undefined, createdAt: string, platform = 'linkedin'): CopyRecord {
  return { id, strategy_id: 's1', user_id: 'u1', text: `text ${id}`, platform, hashtags: [], ...(jobId ? { job_id: jobId } : {}), created_at: createdAt, updated_at: createdAt };
}

function makeScheduler({ copies = [] as CopyRecord[], existing = [] as ScheduledPostRecord[], agent }: { copies?: CopyRecord[]; existing?: ScheduledPostRecord[]; agent?: SchedulerAgentLike } = {}) {
  const repo = makePostsRepo(existing);
  const strategy = { id: 's1', user_id: 'u1', brand_name: 'Lumier', industry: 'Fashion', target_audience: 'a', goals: 'g', strategy_output: {} } as unknown as StrategyRecord;
  const strategyRepo = {
    strategyExists: async () => true,
    getStrategyById: async (_id: string, userId?: string) => (!userId || userId === 'u1' ? strategy : null),
  } as unknown as StrategyRepository;
  const copyRepo = { listCopiesByStrategy: async () => copies } as unknown as CopyRepository;
  const mediaRepo = { getMediaById: async (id: string) => (id === 'mine' ? { userId: 'u1' } : { userId: 'other' }) } as unknown as MediaRepository;
  const autoSchedule = jest.fn(agent?.autoSchedule ?? (async () => ({ posts: [] })));
  const service = new SchedulerService({ autoSchedule }, repo as unknown as SchedulerRepository, copyRepo, strategyRepo, mediaRepo);
  return { service, repo, autoSchedule };
}

describe('SchedulerService', () => {
  const future = slot(Date.now() + 48 * HOUR);

  it("won't attach someone else's media", async () => {
    const { service } = makeScheduler();
    const input = { copy_id: 'manual-1', content: 'hi', platform: 'linkedin', scheduled_date: future.date, scheduled_time: future.time };
    await expect(service.manualSchedule({ ...input, media_id: 'theirs' }, 'u1')).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.manualSchedule({ ...input, media_id: 'mine' }, 'u1')).resolves.toMatchObject({ media_id: 'mine' });
  });

  it('refuses edits that move a post into the past, or touch a post being published', async () => {
    const p = post({ scheduled_date: future.date, scheduled_time: future.time, due_at: undefined });
    const busy = post({ status: 'publishing' });
    const { service } = makeScheduler({ existing: [p, busy] });
    await expect(service.updatePost(p.id, { scheduled_date: '2020-01-01' }, 'u1')).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.updatePost(busy.id, { content: 'x' }, 'u1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rescheduling a failed post starts its attempts afresh and moves its due time', async () => {
    const p = post({ status: 'failed', publish_attempts: 5, last_error: 'boom', last_error_code: 'network_error' });
    const { service, repo } = makeScheduler({ existing: [p] });
    await service.updatePost(p.id, { status: 'scheduled', scheduled_date: future.date, scheduled_time: future.time }, 'u1');
    const after = repo.posts.get(p.id)!;
    expect(after).toMatchObject({ status: 'scheduled', publish_attempts: 0, last_error: null, next_attempt_at: null });
    expect(after.due_at).toBe(`${future.date}T${future.time}:00.000Z`);
  });

  it('reports 404 when the post is deleted mid-edit', async () => {
    const p = post({ scheduled_date: future.date, scheduled_time: future.time });
    const { service, repo } = makeScheduler({ existing: [p] });
    const realUpdate = repo.updatePost;
    repo.updatePost = async (...args) => (repo.posts.delete(p.id), realUpdate(...args));
    await expect(service.updatePost(p.id, { content: 'x' }, 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  describe('autoSchedule', () => {
    const copies = [
      copy('old1', 'set-old', '2026-10-01T10:00:00Z'),
      copy('new1', 'set-new', '2026-10-09T10:00:00Z'),
      copy('new2', 'set-new', '2026-10-09T10:00:01Z', 'x'),
      copy('new3', 'set-new', '2026-10-09T10:00:02Z'),
    ];
    const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date(Date.now() + 24 * HOUR + 2 * HOUR));

    it('schedules the newest set, skipping copies already scheduled and copy ids the model invents', async () => {
      const { service, autoSchedule } = makeScheduler({
        copies,
        existing: [post({ copy_id: 'new3', scheduled_date: future.date, scheduled_time: future.time })],
        agent: {
          autoSchedule: async () => ({
            posts: [
              { copy_id: 'new1', scheduled_date: tomorrow, scheduled_time: '09:00', platform: 'instagram' },
              { copy_id: 'new1', scheduled_date: tomorrow, scheduled_time: '10:00', platform: 'linkedin' },
              { copy_id: 'invented', scheduled_date: tomorrow, scheduled_time: '09:00', platform: 'linkedin' },
              { copy_id: 'new2', scheduled_date: tomorrow, scheduled_time: '09:00', platform: 'x' },
            ],
          }),
        },
      });
      const records = await service.autoSchedule('s1', 'u1', { timezone: 'Africa/Lagos' });
      expect((autoSchedule.mock.calls[0][1] as { id: string }[]).map((c) => c.id)).toEqual(['new1', 'new2']);
      expect(records.map((r) => r.copy_id)).toEqual(['new1', 'new2']);
      // The copy's own platform wins over the model's, and 09:00 in Lagos is 08:00 UTC
      expect(records[0]).toMatchObject({ platform: 'linkedin', scheduled_date: tomorrow, scheduled_time: '08:00' });
    });

    it('moves to the next set once the newest is fully scheduled', async () => {
      const scheduled = ['new1', 'new2', 'new3'].map((id) => post({ copy_id: id, scheduled_date: future.date, scheduled_time: future.time }));
      const { service, autoSchedule } = makeScheduler({ copies, existing: scheduled, agent: { autoSchedule: async () => ({ posts: [] }) } });
      await expect(service.autoSchedule('s1', 'u1')).rejects.toBeTruthy();
      expect((autoSchedule.mock.calls[0][1] as { id: string }[]).map((c) => c.id)).toEqual(['old1']);
    });

    it('never puts two posts on one platform in the same slot', async () => {
      const taken = post({ platform: 'linkedin', scheduled_date: tomorrow, scheduled_time: '08:00' });
      const { service } = makeScheduler({
        copies,
        existing: [taken],
        agent: {
          autoSchedule: async () => ({
            posts: [
              { copy_id: 'new1', scheduled_date: tomorrow, scheduled_time: '09:00', platform: 'linkedin' },
              { copy_id: 'new3', scheduled_date: tomorrow, scheduled_time: '09:00', platform: 'linkedin' },
            ],
          }),
        },
      });
      const records = await service.autoSchedule('s1', 'u1', { timezone: 'Africa/Lagos' });
      expect(records.map((r) => r.scheduled_time)).toEqual(['08:30', '09:00']);
    });

    it('saves nothing if the request was cancelled while the agent worked', async () => {
      const cancel = new AbortController();
      const { service, repo } = makeScheduler({
        copies,
        agent: {
          autoSchedule: async () => {
            cancel.abort();
            return { posts: [{ copy_id: 'new1', scheduled_date: tomorrow, scheduled_time: '09:00', platform: 'linkedin' }] };
          },
        },
      });
      await expect(service.autoSchedule('s1', 'u1', { signal: cancel.signal })).rejects.toMatchObject({ statusCode: 504 });
      expect(repo.posts.size).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------

describe('SchedulerRepository', () => {
  function repoWith(send: jest.Mock) {
    const repo = new SchedulerRepository('posts', 'us-east-1');
    (repo as unknown as { docClient: { send: jest.Mock } }).docClient = { send };
    return repo;
  }
  const item = (id: string) => ({ postId: id, userId: 'u1', status: 'scheduled', scheduledDate: '2030-01-01', scheduledTime: '09:00' });

  it('follows every page of a query', async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Items: [item('a')], LastEvaluatedKey: { postId: 'a' } })
      .mockResolvedValueOnce({ Items: [item('b')] });
    expect((await repoWith(send).listPostsByUser('u1')).map((p) => p.id)).toEqual(['a', 'b']);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('retries batch writes DynamoDB leaves unprocessed', async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ UnprocessedItems: { posts: [{ PutRequest: { Item: item('b') } }] } })
      .mockResolvedValueOnce({});
    await repoWith(send).createPosts([post(), post()]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("returns null instead of creating a partial item when the post doesn't exist", async () => {
    const send = jest.fn().mockRejectedValue(Object.assign(new Error('no'), { name: 'ConditionalCheckFailedException' }));
    expect(await repoWith(send).updatePost('gone', { status: 'published' })).toBeNull();
    expect(send.mock.calls[0][0].input.ConditionExpression).toContain('attribute_exists');
  });

  it('falls back to a filtered scan until the due index exists', async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('no index'), { name: 'ValidationException' }))
      .mockResolvedValueOnce({ Items: [{ ...item('due'), scheduledDate: '2020-01-01' }, { ...item('later'), scheduledDate: '2999-01-01' }] });
    const due = await repoWith(send).findDuePosts(new Date().toISOString());
    expect(due.map((p) => p.id)).toEqual(['due']);
    expect(send.mock.calls[1][0].input.FilterExpression).toContain('#status = :status');
  });
});

describe('LinkedInClient', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('gives up on a request that hangs', async () => {
    global.fetch = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      })) as typeof fetch;
    const started = Date.now();
    const response = await new LinkedInClient(0.05).createTextPost('t', 'urn', 'hi');
    expect(response.error_code).toBe('network_error');
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
