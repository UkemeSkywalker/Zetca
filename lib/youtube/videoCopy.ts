import { TITLE_MAX, tagsLength, TAGS_MAX_CHARS } from '../models/youtubeVideo';
import type { VideoWriterResponse } from '../models/videoWriter';

/** Makes AI-written copy fit YouTube's rules whatever the model returned */
export function cleanVideoCopy(copy: VideoWriterResponse): VideoWriterResponse {
  const strip = (s: string) => s.replace(/[<>]/g, '').trim();
  let title = strip(copy.title).replace(/\s+/g, ' ');
  if (title.length > TITLE_MAX) title = title.slice(0, TITLE_MAX).replace(/\s+\S*$/, '');

  const description = strip(copy.description).slice(0, 4900);

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of copy.tags) {
    const tag = strip(raw).replace(/^#/, '').replace(/,/g, ' ').replace(/\s+/g, ' ').toLowerCase().slice(0, 100);
    if (!tag || seen.has(tag)) continue;
    if (tagsLength([...tags, tag]) > TAGS_MAX_CHARS) break;
    seen.add(tag);
    tags.push(tag);
  }
  return { title, description, tags };
}
