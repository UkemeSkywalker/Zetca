/**
 * @jest-environment node
 */
import { photoRect, photoTones, readableOverlay } from '@/lib/design/photo';
import { setBackground, setPhotoBackground } from '@/lib/design/edit';
import { SAMPLE_PHOTOS, STYLES, paletteById } from '@/lib/design/styles';
import { backgroundColors, DesignInputSchema, type PhotoBackground } from '@/lib/design/types';
import { passes } from '@/lib/design/contrast';
import { StockPhotoService, clearStockPhotoCache, photoKey, type HttpResponse } from '@/lib/services/stockPhotoService';

const bright: PhotoBackground = { ...SAMPLE_PHOTOS.gym, photoId: 'sample:bright', tones: ['#D8D8D8', '#FFFFFF'] };

describe('photo cropping', () => {
  it('fills the design and keeps the focus point in view', () => {
    // A wide photo in a square: crops the sides around the focus
    const left = photoRect(2000, 1000, 1080, 1080, 'fill', 0, 0.5);
    expect(left).toMatchObject({ sx: 0, dw: 1080, dh: 1080 });
    expect(left.sw).toBeCloseTo(1000);
    expect(left.sh).toBeCloseTo(1000);
    const right = photoRect(2000, 1000, 1080, 1080, 'fill', 1, 0.5);
    expect(right.sx).toBeCloseTo(1000);
  });

  it('shows the whole photo when set to fit', () => {
    const r = photoRect(2000, 1000, 1080, 1080, 'fit');
    expect(r).toMatchObject({ dw: 1080, dh: 540, dx: 0, dy: 270 });
  });
});

describe('photo tones', () => {
  it('finds the average and the light parts', () => {
    // 9 black pixels and 1 white one
    const data = new Uint8ClampedArray(40);
    data.set([255, 255, 255, 255], 36);
    const [avg, light] = photoTones(data);
    expect(avg).toBe('#1A1A1A');
    expect(light).toBe('#FFFFFF');
  });
});

describe('readable text on photos', () => {
  const doc = STYLES.find((s) => s.id === 'photo-text')!.build({ headline: 'Show up' }, 'portrait', paletteById('black'), bright);

  it('darkens the overlay until white text reads on a bright photo', () => {
    const fixed = readableOverlay({ ...doc, overlay: { color: '#000000', opacity: 0 } });
    expect(fixed.overlay!.opacity).toBeGreaterThan(0);
    for (const l of fixed.layers) expect(passes(l.color, backgroundColors(fixed))).toBe(true);
  });

  it('adds a dark overlay when a photo replaces a colour', () => {
    const plain = STYLES[0].build({ headline: 'Show up' }, 'square', paletteById('yellow'));
    const withPhoto = setPhotoBackground(plain, bright);
    expect(withPhoto.overlay).toBeDefined();
    for (const l of withPhoto.layers) expect(passes(l.color, backgroundColors(withPhoto))).toBe(true);
  });

  it('drops the overlay when going back to a plain colour', () => {
    expect(setBackground(doc, { kind: 'solid', color: '#15803D' }).overlay).toBeUndefined();
  });

  it('won’t save a design whose photo is only a search preview', () => {
    const preview = { ...doc, background: { ...bright, photoId: 'pixabay:123', previewUrl: 'https://cdn.pixabay.com/x.jpg' } };
    expect(DesignInputSchema.safeParse({ name: 'x', doc: preview }).success).toBe(false);
    expect(DesignInputSchema.safeParse({ name: 'x', doc }).success).toBe(true);
  });
});

describe('stock photo service', () => {
  const hit = {
    id: 42,
    pageURL: 'https://pixabay.com/photos/gym-42/',
    tags: 'gym, weights',
    webformatURL: 'https://pixabay.com/get/abc_640.jpg',
    largeImageURL: 'https://pixabay.com/get/abc_1280.jpg',
    imageWidth: 4000,
    imageHeight: 6000,
    user: 'someone',
  };
  const json = (body: unknown): HttpResponse => ({ status: 200, body: Buffer.from(JSON.stringify(body)) });

  beforeEach(() => {
    process.env.PIXABAY_API_KEY = 'test-key';
    clearStockPhotoCache();
  });

  it('searches Pixabay, leaves out AI and low-quality photos, and caches the result', async () => {
    const get = jest.fn(async () => json({ hits: [hit, { ...hit, id: 43, isAiGenerated: true }, { ...hit, id: 44, isLowQuality: true }] }));
    const service = new StockPhotoService(get, { send: jest.fn() } as never);
    const photos = await service.search('gym');
    expect(photos).toEqual([{ id: 42, previewUrl: hit.webformatURL, width: 4000, height: 6000, credit: { name: 'someone', url: hit.pageURL }, tags: 'gym, weights' }]);
    await service.search('gym');
    expect(get).toHaveBeenCalledTimes(1);
    expect(String((get.mock.calls[0] as unknown[])[0])).toContain('safesearch=true');
  });

  it('copies a picked photo into the user’s storage', async () => {
    const get = jest.fn(async (url: string) => (url.includes('api/') ? json({ hits: [hit] }) : { status: 200, body: Buffer.from('jpeg') }));
    const send = jest.fn(async () => ({}));
    const saved = await new StockPhotoService(get, { send } as never).save('user-1', 42);
    expect(saved).toMatchObject({ width: 853, height: 1280, credit: { name: 'someone', source: 'pixabay' } });
    const put = (send.mock.calls[0] as unknown[])[0] as { input: { Key: string; ContentType: string } };
    expect(put.input.Key).toBe(photoKey('user-1', saved.photoId));
    expect(put.input.ContentType).toBe('image/jpeg');
  });

  it('only reads photos from the user’s own folder', async () => {
    const send = jest.fn(async () => ({ Body: { transformToByteArray: async () => new Uint8Array([1]) } }));
    const service = new StockPhotoService(jest.fn(), { send } as never);
    expect(await service.read('user-1', '../other-user/photos/x')).toBeNull();
    const id = '0b0e5c0c-1111-4222-8333-444455556666';
    await service.read('user-1', id);
    expect(((send.mock.calls[0] as unknown[])[0] as { input: { Key: string } }).input.Key).toBe(`designs/user-1/photos/${id}.jpg`);
  });

  it('says so when stock photos aren’t set up', async () => {
    process.env.PIXABAY_API_KEY = '';
    await expect(new StockPhotoService(jest.fn(), { send: jest.fn() } as never).search('gym')).rejects.toThrow('aren’t set up');
  });
});
