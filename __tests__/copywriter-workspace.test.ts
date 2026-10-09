/**
 * @jest-environment node
 */

import { createCopyExtractor } from '@/lib/agents/copyExtractor';
import { CopyService, JOB_STALE_AFTER_MS, type CopywriterAgentLike } from '@/lib/services/copyService';
import type { CopyRepository } from '@/lib/db/copyRepository';
import type { StrategyRepository } from '@/lib/db/strategyRepository';
import type { CopyChatMessage, CopyItem, CopyJob, CopyRecord } from '@/lib/models/copy';
import type { StrategyRecord } from '@/lib/models/strategy';
import { COPY_PLATFORM_IDS, type CopyPlatformId } from '@/lib/models/copyConstants';

describe('createCopyExtractor', () => {
  const output = JSON.stringify({
    copies: [
      { text: 'First {with braces} and "quotes" \\ backslash', platform: 'Instagram', hashtags: ['#a', '#b'], angle: 'Bold hook' },
      { text: 'Second', platform: 'Instagram', hashtags: [] },
    ],
  });

  it('returns each copy as soon as its object closes, however the text is split', () => {
    for (const size of [1, 3, 7, 50, output.length]) {
      const extract = createCopyExtractor();
      const found: CopyItem[] = [];
      for (let i = 0; i < output.length; i += size) found.push(...extract(output.slice(i, i + size)));
      expect(found.map((c) => c.text)).toEqual(['First {with braces} and "quotes" \\ backslash', 'Second']);
      expect(found[0].angle).toBe('Bold hook');
    }
  });

  it('reports the first copy before the second has been written', () => {
    const extract = createCopyExtractor();
    const cut = output.indexOf('Second');
    expect(extract(output.slice(0, cut))).toHaveLength(1);
    expect(extract(output.slice(cut))).toHaveLength(1);
  });

  it('skips objects that are not valid copies', () => {
    const extract = createCopyExtractor();
    expect(extract('{"copies":[{"platform":"X"},{"text":"ok","platform":"X","hashtags":[]}]}').map((c) => c.text)).toEqual(['ok']);
  });
});

const strategy: StrategyRecord = {
  id: 'strategy-1',
  user_id: 'user-1',
  brand_name: 'Cook with Tolu',
  industry: 'Cooking',
  target_audience: 'Beginners',
  goals: 'Grow',
  strategy_output: {
    content_pillars: ['Quick meals'],
    posting_schedule: '3 a week',
    platform_recommendations: [],
    content_themes: [],
    engagement_tactics: [],
    visual_prompts: [],
  },
  created_at: new Date().toISOString(),
};

/** In-memory stand-ins for the copy and strategy tables */
function makeStore() {
  const copies = new Map<string, CopyRecord>();
  let job: CopyJob | null = null;
  const chat: CopyChatMessage[] = [];

  const copyRepository = {
    createCopy: async (record: CopyRecord) => (copies.set(record.id, record), record),
    listCopiesByStrategy: async (id: string) => [...copies.values()].filter((c) => c.strategy_id === id),
    copyExists: async (id: string) => copies.has(id),
    getCopyById: async (id: string, userId?: string) => {
      const c = copies.get(id);
      return c && (!userId || c.user_id === userId) ? c : null;
    },
    updateCopy: async (id: string, text: string, hashtags: string[]) => {
      const updated = { ...copies.get(id)!, text, hashtags, updated_at: new Date().toISOString() };
      copies.set(id, updated);
      return updated;
    },
  } as unknown as CopyRepository;

  const strategyRepository = {
    strategyExists: async (id: string) => id === strategy.id,
    getStrategyById: async (id: string, userId?: string) =>
      id === strategy.id && (!userId || userId === strategy.user_id) ? strategy : null,
    getCopyWorkspace: async () => ({ job, chat: [...chat] }),
    startCopyJob: async (_id: string, next: CopyJob, staleBefore: string) => {
      if (job && job.status === 'running' && job.updated_at >= staleBefore) return false;
      job = next;
      return true;
    },
    updateCopyJob: async (_id: string, jobId: string, fields: Partial<CopyJob>) => {
      if (job?.id === jobId) job = { ...job, ...fields };
    },
    appendCopyChat: async (_id: string, messages: CopyChatMessage[]) => {
      chat.push(...messages);
    },
  } as unknown as StrategyRepository;

  return { copies, chat, copyRepository, strategyRepository, getJob: () => job };
}

/** An agent whose platforms each write their copies one at a time, when told to */
function makeAgent(failing: CopyPlatformId[] = []) {
  const writers = new Map<CopyPlatformId, { write: () => void; finish: () => void }>();
  const agent: CopywriterAgentLike = {
    generateCopies: async () => ({ copies: [] }),
    generatePlatformCopies: (_data, platform, onCopy) =>
      new Promise((resolve, reject) => {
        const written: CopyItem[] = [];
        writers.set(platform, {
          write: () => {
            const copy = { text: `${platform} copy ${written.length + 1}`, platform, hashtags: [], angle: 'Bold hook' };
            written.push(copy);
            onCopy?.(copy);
          },
          finish: () => (failing.includes(platform) ? reject(new Error('model error')) : resolve(written)),
        });
      }),
    chat: async () => ({ reply: 'ok', action: 'reply' }),
    chatRefine: async () => ({ updated_text: '', updated_hashtags: [], ai_message: '' }),
  };
  return { agent, writers };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CopyService background generation', () => {
  it('saves each copy as it is written, while the job is still running', async () => {
    const store = makeStore();
    const { agent, writers } = makeAgent();
    const service = new CopyService(agent, store.copyRepository, store.strategyRepository);

    const job = await service.startGeneration(strategy.id, 'user-1');
    expect(job.status).toBe('running');
    expect(job.total).toBe(COPY_PLATFORM_IDS.length * 7);

    writers.get('x')!.write();
    writers.get('linkedin')!.write();
    await flush();

    const workspace = await service.getWorkspace(strategy.id, 'user-1');
    expect(workspace.copies.map((c) => c.text).sort()).toEqual(['linkedin copy 1', 'x copy 1']);
    expect(workspace.job?.status).toBe('running');
    expect(workspace.job?.completed).toMatchObject({ x: 1, linkedin: 1, instagram: 0 });
    expect(workspace.copies.every((c) => c.job_id === job.id)).toBe(true);
  });

  it('finishes with a chat summary, and reports platforms that failed', async () => {
    const store = makeStore();
    const { agent, writers } = makeAgent(['facebook']);
    const service = new CopyService(agent, store.copyRepository, store.strategyRepository);

    await service.startGeneration(strategy.id, 'user-1');
    for (const p of COPY_PLATFORM_IDS) {
      writers.get(p)!.write();
      writers.get(p)!.finish();
    }
    await flush();
    await flush();

    const job = store.getJob()!;
    expect(job.status).toBe('done');
    expect(job.failed_platforms).toEqual(['facebook']);
    expect(job.error).toMatch(/Facebook/);
    // An announcement when it started, and a summary at the end
    expect(store.chat.map((m) => m.action)).toEqual(['generate_all', 'job_done']);
  });

  it('returns the running job instead of starting a second one', async () => {
    const store = makeStore();
    const { agent } = makeAgent();
    const service = new CopyService(agent, store.copyRepository, store.strategyRepository);

    const first = await service.startGeneration(strategy.id, 'user-1');
    const second = await service.startGeneration(strategy.id, 'user-1');
    expect(second.id).toBe(first.id);
  });

  it('reports a running job that stopped updating as interrupted', async () => {
    const store = makeStore();
    const { agent } = makeAgent();
    const service = new CopyService(agent, store.copyRepository, store.strategyRepository);

    const job = await service.startGeneration(strategy.id, 'user-1');
    await store.strategyRepository.updateCopyJob(strategy.id, job.id, {
      updated_at: new Date(Date.now() - JOB_STALE_AFTER_MS - 1000).toISOString(),
    });

    const workspace = await service.getWorkspace(strategy.id, 'user-1');
    expect(workspace.job?.status).toBe('failed');
    expect(workspace.job?.error).toMatch(/interrupted/);
  });

  it("refuses another user's strategy", async () => {
    const store = makeStore();
    const { agent } = makeAgent();
    const service = new CopyService(agent, store.copyRepository, store.strategyRepository);
    await expect(service.startGeneration(strategy.id, 'someone-else')).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('CopyService chat', () => {
  function serviceWith(decision: Awaited<ReturnType<CopywriterAgentLike['chat']>>) {
    const store = makeStore();
    const { agent } = makeAgent();
    const chat = jest.fn(async () => decision);
    const service = new CopyService({ ...agent, chat }, store.copyRepository, store.strategyRepository);
    return { store, service, chat };
  }

  it('creates a new copy and saves both sides of the conversation', async () => {
    const { store, service } = serviceWith({
      reply: 'Here you go',
      action: 'create',
      copy: { text: 'A LinkedIn post', platform: 'LinkedIn', hashtags: ['#win'] },
    });

    const result = await service.chat(strategy.id, 'user-1', 'Write a LinkedIn post');

    expect(result.copy?.platform).toBe('linkedin');
    expect(result.copy?.angle).toBe('From chat');
    expect(store.copies.size).toBe(1);
    expect(store.chat.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(store.chat[1].copy_id).toBe(result.copy?.id);
  });

  it('rewrites the open copy in place', async () => {
    const { store, service, chat } = serviceWith({
      reply: 'Punchier now',
      action: 'update',
      copy: { text: 'Punchy!', platform: 'X', hashtags: [] },
    });
    const existing = await store.copyRepository.createCopy({
      id: 'copy-1',
      strategy_id: strategy.id,
      user_id: 'user-1',
      text: 'A long, slow post',
      platform: 'x',
      hashtags: [],
      created_at: '',
      updated_at: '',
    });

    const result = await service.chat(strategy.id, 'user-1', 'Make it punchier', existing.id);

    expect(chat).toHaveBeenCalledWith(expect.anything(), [], 'Make it punchier', expect.objectContaining({ text: 'A long, slow post' }));
    expect(result.copy?.id).toBe('copy-1');
    expect(store.copies.get('copy-1')?.text).toBe('Punchy!');
    expect(store.copies.size).toBe(1);
  });

  it('starts a full set when asked', async () => {
    const { store, service } = serviceWith({ reply: 'Writing them now', action: 'generate_all' });
    const result = await service.chat(strategy.id, 'user-1', 'Generate a full set');
    expect(result.job?.status).toBe('running');
    // The chat reply announces it, so there's no second announcement
    expect(store.chat.map((m) => m.action ?? m.role)).toEqual(['user', 'generate_all']);
  });
});
