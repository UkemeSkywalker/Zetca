import { COPY_PLATFORMS, CopyPlatformId, normalizePlatform } from '@/lib/models/copyConstants';

export const PLATFORM_STYLE: Record<CopyPlatformId, { icon: string; badge: string }> = {
  x: { icon: 'simple-icons:x', badge: 'bg-slate-100 text-black' },
  instagram: { icon: 'simple-icons:instagram', badge: 'bg-pink-50 text-pink-600' },
  tiktok: { icon: 'simple-icons:tiktok', badge: 'bg-slate-100 text-slate-900' },
  linkedin: { icon: 'simple-icons:linkedin', badge: 'bg-blue-50 text-[#0A66C2]' },
  facebook: { icon: 'simple-icons:facebook', badge: 'bg-blue-50 text-[#1877F2]' },
  youtube: { icon: 'simple-icons:youtube', badge: 'bg-red-50 text-red-600' },
};

const OTHER = { label: 'Other', limit: 2200, icon: 'material-symbols:public', badge: 'bg-slate-100 text-slate-600' };

/** Label, character limit and styling for a copy's platform (any spelling) */
export function platformInfo(platform: string) {
  const id = normalizePlatform(platform) as CopyPlatformId;
  if (!(id in COPY_PLATFORMS)) return { id: 'other', ...OTHER };
  return { id, label: COPY_PLATFORMS[id].label, limit: COPY_PLATFORMS[id].limit, ...PLATFORM_STYLE[id] };
}

/** Hashtags with a leading # */
export function formatHashtags(hashtags: string[]): string[] {
  return hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`));
}

/** The text that goes on the clipboard: caption plus hashtags */
export function clipboardText(text: string, hashtags: string[]): string {
  return hashtags.length ? `${text}\n\n${formatHashtags(hashtags).join(' ')}` : text;
}

/** Copy to the clipboard, falling back to a hidden textarea where the clipboard API is blocked */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
