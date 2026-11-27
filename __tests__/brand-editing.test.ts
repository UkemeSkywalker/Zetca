/**
 * @jest-environment node
 */
import { applyBrandEdit, adjustPrompt, brandSnapshot, noteHandEdit } from '@/lib/research/brandEdit';
import { BrandAdjustmentSchema, BrandEditSchema, type BrandProfile, type BrandResearch } from '@/lib/models/brandResearch';
import { BrandResearchService, ResearchNotReadyError, STEPS } from '@/lib/services/brandResearchService';
import { withCredits } from '@/lib/billing/charge';

jest.mock('@/lib/billing/charge', () => ({
  ...jest.requireActual('@/lib/billing/charge'),
  withCredits: jest.fn((_user: string, _action: string, _cost: number, fn: () => Promise<unknown>) => fn()),
}));

const profile: BrandProfile = {
  brandName: 'Ukeme Eseme',
  tagline: 'Cloud, DevOps and platform engineer',
  category: 'devops engineer',
  location: 'Lagos',
  offerings: ['Cloud infrastructure', 'DevOps automation'],
  audience: ['Learners', 'Recruiters', 'DevOps teams'],
  voice: ['Clear', 'Practical'],
  goals: [],
  strengths: [],
  facts: [],
  brandKit: {
    colors: [
      { hex: '#0C0C0C', role: 'primary', name: 'Ink' },
      { hex: '#D7E2EA', role: 'background', name: 'Cloud Mist' },
    ],
    headingFont: 'Kanit',
    bodyFont: 'Kanit',
    look: ['Dark backgrounds'],
  },
  missing: ['Who do you most want to reach?', 'Which platforms will you prioritise?'],
  styles: [],
};

const research = (over: Partial<BrandResearch> = {}): BrandResearch => ({
  researchId: '00000000-0000-4000-8000-000000000000',
  userId: 'u1',
  message: 'I am a cloud engineer and want more followers',
  status: 'done',
  steps: STEPS.map((s) => ({ ...s, status: 'done' as const })),
  socials: {},
  media: { images: [], videos: [] },
  chips: ['Cloud infrastructure', 'DevOps automation', 'Lagos'],
  profile,
  competitors: [],
  cost: 20,
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('changing the brand result', () => {
  it('changes only the parts asked for and reports what really changed', () => {
    const r = research();
    const { research: next, changed } = applyBrandEdit(r, { audience: ['DevOps teams', 'Platform engineers'], voice: ['Clear', 'Practical'] });
    expect(changed).toEqual(['audience']);
    expect(next.profile!.audience).toEqual(['DevOps teams', 'Platform engineers']);
    expect(next.profile!.brandKit).toEqual(profile.brandKit);
    expect(next.profile!.tagline).toBe(profile.tagline);
    // The original isn't touched
    expect(r.profile!.audience).toEqual(profile.audience);
  });

  it('keeps the specialty chips and the offerings in step, without the location', () => {
    const { research: next } = applyBrandEdit(research(), { specialties: ['Platform engineering', 'Lagos', 'SRE'] });
    expect(next.chips).toEqual(['Platform engineering', 'Lagos', 'SRE']);
    expect(next.profile!.offerings).toEqual(['Platform engineering', 'SRE']);
  });

  it('changes colours and fonts; a null font removes it', () => {
    const colors = [{ hex: '#B5532F', role: 'primary' as const, name: 'Rust' }];
    const { research: next, changed } = applyBrandEdit(research(), { colors, headingFont: 'Fraunces', bodyFont: null });
    expect(changed).toEqual(['colors', 'headingFont', 'bodyFont']);
    expect(next.profile!.brandKit.colors).toEqual(colors);
    expect(next.profile!.brandKit.headingFont).toBe('Fraunces');
    expect('bodyFont' in next.profile!.brandKit).toBe(false);
  });

  it('sets the positioning even when there was no comparison', () => {
    const { research: next } = applyBrandEdit(research(), { positioning: 'The DevOps engineer who explains it plainly' });
    expect(next.comparison).toEqual({ whatWorks: [], gap: '', positioning: 'The DevOps engineer who explains it plainly' });
  });

  it('does nothing before there is a result', () => {
    const r = research({ profile: undefined });
    expect(applyBrandEdit(r, { tagline: 'x' })).toEqual({ research: r, changed: [] });
    expect(brandSnapshot(r)).toBeNull();
  });

  it('notes hand edits in the chat, folding edits in a row into one note', () => {
    let chat = noteHandEdit([], ['colors'], 't1');
    chat = noteHandEdit(chat, ['audience', 'colors'], 't2');
    expect(chat).toEqual([{ role: 'edit', text: 'You changed colours and customers by hand', changed: ['colors', 'audience'], at: 't2' }]);
    chat = noteHandEdit([...chat, { role: 'user', text: 'hi', at: 't3' }], ['tagline'], 't4');
    expect(chat).toHaveLength(3);
    expect(noteHandEdit(chat, [], 't5')).toBe(chat);
  });

  it('gives the agent the result as it is now, with hand edits and the conversation', () => {
    const { research: edited } = applyBrandEdit(research(), { audience: ['Platform engineers'] });
    const prompt = adjustPrompt({ ...edited, chat: [{ role: 'edit', text: 'You changed customers by hand', at: '' }, { role: 'user', text: 'Make it warmer', at: '' }] }, 'Drop recruiters');
    expect(prompt).toContain('"Platform engineers"');
    expect(prompt).not.toContain('"Recruiters"');
    expect(prompt).toContain('(You changed customers by hand)');
    expect(prompt).toContain('User: Make it warmer');
    expect(prompt).toContain('"""Drop recruiters"""');
    expect(prompt).toContain('"headingFont": "Kanit"');
  });
});

describe('what the page and the agent may send', () => {
  it('accepts a hand edit of known fields and refuses bad ones', () => {
    expect(BrandEditSchema.parse({ colors: [{ hex: '#0C0C0C', role: 'primary', name: 'Ink' }] })).toBeTruthy();
    expect(BrandEditSchema.parse({ headingFont: null })).toEqual({ headingFont: null });
    expect(() => BrandEditSchema.parse({ colors: [{ hex: 'red', role: 'primary', name: 'Red' }] })).toThrow();
    expect(() => BrandEditSchema.parse({ audience: [''] })).toThrow();
    expect(() => BrandEditSchema.parse({ userId: 'someone-else' })).toThrow();
    expect(() => BrandEditSchema.parse({ audience: Array(7).fill('x') })).toThrow();
  });

  it('lets the agent send only some fields', () => {
    expect(BrandAdjustmentSchema.parse({ reply: 'Done', changes: { voice: ['Warm'] } }).changes).toEqual({ voice: ['Warm'] });
  });
});

describe('the research service', () => {
  function setup(start: BrandResearch) {
    const files = new Map<string, string>();
    const key = `research/${start.userId}/${start.researchId}.json`;
    files.set(key, JSON.stringify(start));
    const s3 = {
      send: jest.fn(async (cmd: { constructor: { name: string }; input: { Key: string; Body?: string } }) => {
        if (cmd.constructor.name === 'PutObjectCommand') return files.set(cmd.input.Key, cmd.input.Body!), {};
        return { Body: { transformToString: async () => files.get(cmd.input.Key)! } };
      }),
    };
    const writer = { profile: jest.fn(), pickCompetitors: jest.fn(), compare: jest.fn(), adjust: jest.fn() };
    const service = new BrandResearchService(writer, { available: false } as never, s3 as never);
    const saved = () => JSON.parse(files.get(key)!) as BrandResearch;
    return { service, writer, files, key, saved };
  }

  beforeEach(() => jest.mocked(withCredits).mockClear());

  it('saves a hand edit and notes it for the agent', async () => {
    const t = setup(research());
    const out = await t.service.edit('u1', research().researchId, { tagline: 'I make cloud simple' });
    expect(out.profile!.tagline).toBe('I make cloud simple');
    expect(t.saved().profile!.tagline).toBe('I make cloud simple');
    expect(t.saved().chat).toEqual([expect.objectContaining({ role: 'edit', changed: ['tagline'] })]);
  });

  it('doesn’t save an edit that changes nothing', async () => {
    const t = setup(research());
    await t.service.edit('u1', research().researchId, { tagline: profile.tagline });
    expect(t.saved().chat).toBeUndefined();
  });

  it('won’t change research that is still running', async () => {
    const t = setup(research({ status: 'working' }));
    await expect(t.service.edit('u1', research().researchId, { tagline: 'x' })).rejects.toBeInstanceOf(ResearchNotReadyError);
    await expect(t.service.adjust('u1', research().researchId, 'warmer')).rejects.toBeInstanceOf(ResearchNotReadyError);
    expect(t.writer.adjust).not.toHaveBeenCalled();
  });

  it('changes just what the chat asks for, charges for it and keeps the conversation', async () => {
    const t = setup(research());
    t.writer.adjust.mockResolvedValue({ reply: 'Dropped recruiters and focused on DevOps teams.', changes: { audience: ['DevOps teams'], missing: ['Which platforms will you prioritise?'] } });
    const out = await t.service.adjust('u1', research().researchId, 'drop recruiters, focus on DevOps teams');
    expect(withCredits).toHaveBeenCalledWith('u1', 'brand_chat', 1, expect.any(Function), research().researchId);
    expect(out.profile!.audience).toEqual(['DevOps teams']);
    expect(out.profile!.missing).toEqual(['Which platforms will you prioritise?']);
    expect(out.profile!.brandKit).toEqual(profile.brandKit);
    expect(t.saved().chat).toEqual([
      expect.objectContaining({ role: 'user', text: 'drop recruiters, focus on DevOps teams' }),
      expect.objectContaining({ role: 'zetca', text: 'Dropped recruiters and focused on DevOps teams.', changed: ['audience', 'missing'] }),
    ]);
  });

  it('shows the agent hand edits, and keeps a hand edit made while it was thinking', async () => {
    const t = setup(research());
    await t.service.edit('u1', research().researchId, { voice: ['Witty'] });
    t.writer.adjust.mockImplementation(async (seen: BrandResearch) => {
      // The agent saw the earlier hand edit and the note about it
      expect(seen.profile!.voice).toEqual(['Witty']);
      expect(seen.chat?.[0]).toMatchObject({ role: 'edit' });
      // The user changes the tagline by hand while the agent works
      await t.service.edit('u1', research().researchId, { tagline: 'Edited meanwhile' });
      return { reply: 'Warmer now.', changes: { colors: [{ hex: '#B5532F', role: 'primary', name: 'Rust' }] } };
    });
    const out = await t.service.adjust('u1', research().researchId, 'make the colours warmer');
    expect(out.profile!.tagline).toBe('Edited meanwhile');
    expect(out.profile!.voice).toEqual(['Witty']);
    expect(out.profile!.brandKit.colors[0].hex).toBe('#B5532F');
  });

  it('replies without changing anything when the message is a question', async () => {
    const t = setup(research());
    t.writer.adjust.mockResolvedValue({ reply: 'Kanit is a clean geometric sans.', changes: {} });
    const out = await t.service.adjust('u1', research().researchId, 'what font is that?');
    expect(out.profile).toEqual(profile);
    expect(out.chat?.at(-1)).toEqual(expect.not.objectContaining({ changed: expect.anything() }));
  });

  it('saves nothing when the agent fails', async () => {
    const t = setup(research());
    t.writer.adjust.mockRejectedValue(new Error('model down'));
    await expect(t.service.adjust('u1', research().researchId, 'warmer')).rejects.toThrow('model down');
    expect(t.saved().chat).toBeUndefined();
  });
});
