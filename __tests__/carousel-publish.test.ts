/**
 * @jest-environment node
 */
import fs from 'fs';
import { PublisherService, carouselTitle } from '@/lib/services/publisherService';
import type { LinkedInClient } from '@/lib/services/linkedinClient';
import type { PublisherRepository } from '@/lib/db/publisherRepository';
import type { SchedulerRepository } from '@/lib/db/schedulerRepository';
import type { UserRepository } from '@/lib/db/userRepository';
import type { MediaRepository } from '@/lib/db/mediaRepository';
import { newScheduledPostRecord, type ScheduledPostRecord } from '@/lib/models/scheduler';
import { pagesToPdf, slidesToPages } from '@/lib/media/slidesPdf';

const slide = fs.readFileSync('public/designer/styles/frame-bubble.jpg');

function carouselPost(overrides: Partial<ScheduledPostRecord> = {}): ScheduledPostRecord {
  return {
    ...newScheduledPostRecord({
      strategy_id: 's1',
      copy_id: 'c1',
      user_id: 'u1',
      content: '5 ways to get more weekend orders\nSwipe through 👉 #bakery',
      platform: 'linkedin',
      scheduled_date: '2030-01-01',
      scheduled_time: '09:00',
      status: 'scheduled',
      media_id: 'm1',
      media_type: 'image',
      media_ids: ['m1', 'm2', 'm3'],
    }),
    ...overrides,
  };
}

function setup({ documentInit = 'ok' as 'ok' | 403 | 500, missing = '' } = {}) {
  const posts = new Map<string, ScheduledPostRecord>();
  const repo = {
    getPostById: async (id: string) => posts.get(id) ?? null,
    updatePost: async (id: string, updates: Record<string, unknown>) => {
      const p = posts.get(id)!;
      Object.assign(p, updates);
      return { ...p };
    },
    claimPost: async (id: string) => {
      const p = posts.get(id)!;
      Object.assign(p, { status: 'publishing', claimed_at: new Date().toISOString(), publish_attempts: (p.publish_attempts ?? 0) + 1 });
      return { ...p };
    },
  };
  const ok = { status_code: 201, post_id: 'urn:li:share:1' };
  const linkedin = {
    formatCommentary: (c: string) => c,
    createTextPost: jest.fn(async () => ok),
    createImagePost: jest.fn(async () => ok),
    initializeImageUpload: jest.fn(async () => ({ upload_url: 'img-url', image_urn: `urn:li:image:${Math.random()}` })),
    uploadImageBinary: jest.fn(async () => 201),
    initializeDocumentUpload: jest.fn(async () => {
      if (documentInit !== 'ok') throw Object.assign(new Error(`status ${documentInit}`), { status: documentInit });
      return { upload_url: 'doc-url', document_urn: 'urn:li:document:1' };
    }),
    uploadDocument: jest.fn(async () => undefined),
    documentStatus: jest.fn().mockResolvedValueOnce('PROCESSING').mockResolvedValue('AVAILABLE'),
    createDocumentPost: jest.fn(async () => ok),
    createMultiImagePost: jest.fn(async () => ok),
  };
  const logs: unknown[] = [];
  const publisherRepo = { createLog: async (l: unknown) => (logs.push(l), l), listLogsByPost: async () => [] } as unknown as PublisherRepository;
  const userRepo = { getUserLinkedInCredentials: async () => ({ linkedinAccessToken: 't', linkedinSub: 'sub' }) } as unknown as UserRepository;
  const mediaRepo = {
    getMediaById: async (id: string) => (id === missing ? null : { mediaId: id, userId: 'u1', s3Key: id, contentType: 'image/jpeg' }),
  } as unknown as MediaRepository;
  const service = new PublisherService(linkedin as unknown as LinkedInClient, publisherRepo, repo as unknown as SchedulerRepository, userRepo, mediaRepo, 'bucket');
  service.documentPollMs = 1;
  (service as unknown as { downloadFromS3: () => Promise<Buffer> }).downloadFromS3 = async () => slide;
  const add = (p: ScheduledPostRecord) => (posts.set(p.id, p), p);
  return { service, linkedin, posts, add };
}

describe('publishing carousels to LinkedIn', () => {
  it('posts the slides as one PDF document once LinkedIn has read it', async () => {
    const { service, linkedin, add, posts } = setup();
    const p = add(carouselPost());
    const log = await service.publishNow(p.id, 'u1');
    expect(log.status).toBe('published');
    expect(linkedin.initializeDocumentUpload).toHaveBeenCalledTimes(1);
    const [, , pdf] = linkedin.uploadDocument.mock.calls[0] as unknown as [string, string, Buffer];
    expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(pdf.toString('latin1').match(/\/Type \/Page /g)).toHaveLength(3);
    expect(linkedin.documentStatus).toHaveBeenCalledTimes(2);
    expect(linkedin.createDocumentPost).toHaveBeenCalledWith('t', 'urn:li:person:sub', p.content, 'urn:li:document:1', '5 ways to get more weekend orders');
    expect(linkedin.createImagePost).not.toHaveBeenCalled();
    expect(posts.get(p.id)?.status).toBe('published');
  });

  it('falls back to a multi-image post when LinkedIn won’t take documents', async () => {
    const { service, linkedin, add } = setup({ documentInit: 403 });
    const p = add(carouselPost());
    const log = await service.publishNow(p.id, 'u1');
    expect(log.status).toBe('published');
    expect(linkedin.initializeImageUpload).toHaveBeenCalledTimes(3);
    const [, , , urns, alts] = linkedin.createMultiImagePost.mock.calls[0] as unknown as [string, string, string, string[], string[]];
    expect(urns).toHaveLength(3);
    expect(alts).toEqual(['Slide 1 of 3', 'Slide 2 of 3', 'Slide 3 of 3']);
  });

  it('retries later when LinkedIn has a temporary problem, rather than posting something else', async () => {
    const { service, linkedin, add, posts } = setup({ documentInit: 500 });
    const p = add(carouselPost());
    await service.publishNow(p.id, 'u1');
    expect(linkedin.createMultiImagePost).not.toHaveBeenCalled();
    expect(posts.get(p.id)?.status).not.toBe('published');
  });

  it('doesn’t post half a carousel when a slide is missing', async () => {
    const { service, linkedin, add } = setup({ missing: 'm2' });
    const p = add(carouselPost());
    const log = await service.publishNow(p.id, 'u1');
    expect(log.status).not.toBe('published');
    expect(linkedin.initializeDocumentUpload).not.toHaveBeenCalled();
    expect(linkedin.createImagePost).not.toHaveBeenCalled();
  });

  it('posts a single image as before', async () => {
    const { service, linkedin, add } = setup();
    const p = add(carouselPost({ media_ids: null }));
    await service.publishNow(p.id, 'u1');
    expect(linkedin.createImagePost).toHaveBeenCalledTimes(1);
    expect(linkedin.initializeDocumentUpload).not.toHaveBeenCalled();
  });
});

describe('carousel PDFs and titles', () => {
  it('writes a valid PDF with a page per slide', async () => {
    const pdf = pagesToPdf(await slidesToPages([slide, slide]));
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.match(/\/Type \/Page /g)).toHaveLength(2);
    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(2);
    // The cross-reference table points at each object
    const xrefAt = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const first = Number(text.slice(xrefAt).split('\n')[3].slice(0, 10));
    expect(text.slice(first, first + 7)).toBe('1 0 obj');
  });

  it('titles the carousel with the post’s first line, without hashtags, kept short', () => {
    expect(carouselTitle('Bread that sells #bakery\nMore text')).toBe('Bread that sells');
    expect(carouselTitle('\n\n#only #tags')).toBe('Carousel');
    expect(carouselTitle('x'.repeat(150))).toHaveLength(98);
  });
});
