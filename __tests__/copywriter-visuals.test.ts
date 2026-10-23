/**
 * @jest-environment node
 */
import { CopyVisualSchema, suggestedVisual, newCopyRecord, type CopyRecord, type CopyVisual } from '@/lib/models/copy';
import { createCopyStreamParser } from '@/lib/agents/copyStreamParser';
import { CopyService } from '@/lib/services/copyService';
import { MediaRepository } from '@/lib/db/mediaRepository';

describe('suggested visuals', () => {
  it('follows the copywriter’s suggestion', () => {
    expect(suggestedVisual('linkedin', 'photo')).toEqual({ kind: 'stock' });
    expect(suggestedVisual('x', 'text')).toEqual({ kind: 'template' });
    expect(suggestedVisual('facebook', 'none')).toEqual({ kind: 'none' });
    expect(suggestedVisual('linkedin')).toEqual({ kind: 'none' });
  });

  it('never leaves Instagram or TikTok without one', () => {
    expect(suggestedVisual('instagram', 'none')).toEqual({ kind: 'template' });
    expect(suggestedVisual('tiktok')).toEqual({ kind: 'stock' });
  });

  it('needs a media type with an image', () => {
    expect(CopyVisualSchema.safeParse({ kind: 'template', media_id: 'm1' }).success).toBe(false);
    expect(CopyVisualSchema.safeParse({ kind: 'template', media_id: 'm1', media_type: 'image' }).success).toBe(true);
  });
});

describe('the copywriter’s VISUAL line', () => {
  it('is read from each copy block', () => {
    const parse = createCopyStreamParser('instagram');
    const [copy] = parse('### COPY\nANGLE: Bold hook\nVISUAL: photo\nHASHTAGS: #a\nTEXT:\nHello\n### END');
    expect(copy).toMatchObject({ text: 'Hello', angle: 'Bold hook', visual: 'photo' });
  });

  it('ignores anything that isn’t none, text or photo', () => {
    const parse = createCopyStreamParser('x');
    const [copy] = parse('### COPY\nVISUAL: hologram\nTEXT:\nHi\n### END');
    expect(copy.visual).toBeUndefined();
  });
});

describe('setting a post’s visual', () => {
  const ig = newCopyRecord({ strategy_id: 's1', user_id: 'user-1', text: 'Hi', platform: 'instagram', hashtags: [] });
  const li = { ...ig, id: 'li-1', platform: 'linkedin' };

  function makeService() {
    const records = new Map<string, CopyRecord>([
      [ig.id, ig],
      [li.id, li],
    ]);
    const copyRepository = {
      copyExists: async (id: string) => records.has(id),
      getCopyById: async (id: string, userId?: string) => {
        const r = records.get(id);
        return r && (!userId || r.user_id === userId) ? r : null;
      },
      updateVisual: jest.fn(async (id: string, visual: CopyVisual) => ({ ...records.get(id)!, visual })),
    };
    return { service: new CopyService({} as never, copyRepository as never, {} as never), copyRepository };
  }

  beforeEach(() => {
    jest.spyOn(MediaRepository.prototype, 'getMediaById').mockImplementation(async (mediaId: string) =>
      mediaId === 'mine' ? ({ mediaId, userId: 'user-1' } as never) : mediaId === 'theirs' ? ({ mediaId, userId: 'user-2' } as never) : null
    );
  });
  afterEach(() => jest.restoreAllMocks());

  it('won’t take Instagram down to no visual', async () => {
    const { service } = makeService();
    await expect(service.setVisual(ig.id, 'user-1', { kind: 'none' })).rejects.toThrow('Instagram posts need an image or video');
    await expect(service.setVisual(li.id, 'user-1', { kind: 'none' })).resolves.toMatchObject({ visual: { kind: 'none' } });
  });

  it('only attaches the user’s own images', async () => {
    const { service, copyRepository } = makeService();
    await expect(service.setVisual(ig.id, 'user-1', { kind: 'template', media_id: 'theirs', media_type: 'image' })).rejects.toThrow('isn’t yours');
    await service.setVisual(ig.id, 'user-1', { kind: 'template', design_id: 'd1', media_id: 'mine', media_type: 'image' });
    expect(copyRepository.updateVisual).toHaveBeenCalledWith(ig.id, { kind: 'template', design_id: 'd1', media_id: 'mine', media_type: 'image' });
  });

  it('won’t touch someone else’s post', async () => {
    const { service } = makeService();
    await expect(service.setVisual(ig.id, 'user-2', { kind: 'template' })).rejects.toThrow('Access denied');
  });
});
