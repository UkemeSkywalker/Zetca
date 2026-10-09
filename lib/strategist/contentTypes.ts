/**
 * Content types for the Strategist quiz's "What do you create?" question, grouped
 * for the content step. Kept free of React so the agents can use the labels too.
 *
 * Preset types are stored by id. Types the user adds with "+ Other" are stored
 * as the text they typed, so any value that isn't a preset id is its own label.
 */

export interface ContentType {
  id: string;
  label: string;
  icon: string;
  iconSelected: string;
}

export interface ContentTypeCategory {
  label: string;
  types: ContentType[];
}

/** How many content types can be picked (the schema's limit) */
export const MAX_CONTENT_TYPES = 10;

/** Icon for types the user typed themselves */
export const CUSTOM_CONTENT_TYPE_ICON = 'material-symbols:interests-outline';
export const CUSTOM_CONTENT_TYPE_ICON_SELECTED = 'material-symbols:interests';

export const CONTENT_TYPE_CATEGORIES: ContentTypeCategory[] = [
  {
    label: 'Video',
    types: [
      { id: 'tutorials', label: 'Tutorials', icon: 'material-symbols:play-lesson-outline', iconSelected: 'material-symbols:play-lesson' },
      { id: 'shorts', label: 'Shorts / Reels', icon: 'material-symbols:smart-display-outline', iconSelected: 'material-symbols:smart-display' },
      { id: 'vlogs', label: 'Vlogs', icon: 'material-symbols:videocam-outline', iconSelected: 'material-symbols:videocam' },
      { id: 'reviews', label: 'Reviews', icon: 'material-symbols:rate-review-outline', iconSelected: 'material-symbols:rate-review' },
      { id: 'explainers', label: 'Explainers', icon: 'material-symbols:school-outline', iconSelected: 'material-symbols:school' },
      { id: 'day-in-the-life', label: 'Day in the life', icon: 'material-symbols:wb-sunny-outline', iconSelected: 'material-symbols:wb-sunny' },
      { id: 'unboxings', label: 'Unboxings', icon: 'material-symbols:package-2-outline', iconSelected: 'material-symbols:package-2' },
      { id: 'reactions', label: 'Reactions', icon: 'material-symbols:add-reaction-outline', iconSelected: 'material-symbols:add-reaction' },
      { id: 'documentaries', label: 'Mini documentaries', icon: 'material-symbols:movie-outline', iconSelected: 'material-symbols:movie' },
      { id: 'live', label: 'Live', icon: 'material-symbols:sensors', iconSelected: 'material-symbols:sensors' },
      { id: 'skits', label: 'Skits & sketches', icon: 'material-symbols:theater-comedy-outline', iconSelected: 'material-symbols:theater-comedy' },
      { id: 'transformations', label: 'Before & after', icon: 'material-symbols:compare-arrows', iconSelected: 'material-symbols:compare-arrows' },
    ],
  },
  {
    label: 'Posts & visuals',
    types: [
      { id: 'tips', label: 'Tips', icon: 'material-symbols:lightbulb-outline', iconSelected: 'material-symbols:lightbulb' },
      { id: 'carousels', label: 'Carousels', icon: 'material-symbols:view-carousel-outline', iconSelected: 'material-symbols:view-carousel' },
      { id: 'infographics', label: 'Infographics', icon: 'material-symbols:stacked-bar-chart', iconSelected: 'material-symbols:bar-chart' },
      { id: 'memes', label: 'Memes & humour', icon: 'material-symbols:sentiment-very-satisfied-outline', iconSelected: 'material-symbols:sentiment-very-satisfied' },
      { id: 'quotes', label: 'Quotes', icon: 'material-symbols:format-quote-outline', iconSelected: 'material-symbols:format-quote' },
      { id: 'threads', label: 'Threads & long posts', icon: 'material-symbols:article-outline', iconSelected: 'material-symbols:article' },
      { id: 'photography', label: 'Photography', icon: 'material-symbols:photo-camera-outline', iconSelected: 'material-symbols:photo-camera' },
      { id: 'newsletters', label: 'Newsletters & blogs', icon: 'material-symbols:mail-outline', iconSelected: 'material-symbols:mail' },
    ],
  },
  {
    label: 'Audio',
    types: [
      { id: 'podcast', label: 'Podcast', icon: 'material-symbols:podcasts', iconSelected: 'material-symbols:podcasts' },
      { id: 'interviews', label: 'Interviews', icon: 'material-symbols:mic-outline', iconSelected: 'material-symbols:mic' },
      { id: 'voiceovers', label: 'Voiceovers & narration', icon: 'material-symbols:record-voice-over-outline', iconSelected: 'material-symbols:record-voice-over' },
      { id: 'music', label: 'Music & covers', icon: 'material-symbols:music-note', iconSelected: 'material-symbols:music-note' },
    ],
  },
  {
    label: 'Community & business',
    types: [
      { id: 'fun', label: 'Fun & challenges', icon: 'material-symbols:celebration-outline', iconSelected: 'material-symbols:celebration' },
      { id: 'behind-the-scenes', label: 'Behind the scenes', icon: 'material-symbols:visibility-outline', iconSelected: 'material-symbols:visibility' },
      { id: 'storytelling', label: 'Storytelling', icon: 'material-symbols:auto-stories-outline', iconSelected: 'material-symbols:auto-stories' },
      { id: 'qa', label: 'Q&A / AMAs', icon: 'material-symbols:forum-outline', iconSelected: 'material-symbols:forum' },
      { id: 'polls', label: 'Polls & quizzes', icon: 'material-symbols:checklist', iconSelected: 'material-symbols:checklist' },
      { id: 'news', label: 'News & trends', icon: 'material-symbols:trending-up', iconSelected: 'material-symbols:trending-up' },
      { id: 'case-studies', label: 'Case studies', icon: 'material-symbols:cases-outline', iconSelected: 'material-symbols:cases' },
      { id: 'testimonials', label: 'Testimonials', icon: 'material-symbols:reviews-outline', iconSelected: 'material-symbols:reviews' },
      { id: 'product-demos', label: 'Product demos', icon: 'material-symbols:storefront-outline', iconSelected: 'material-symbols:storefront' },
      { id: 'webinars', label: 'Webinars & workshops', icon: 'material-symbols:co-present-outline', iconSelected: 'material-symbols:co-present' },
      { id: 'events', label: 'Event coverage', icon: 'material-symbols:event-outline', iconSelected: 'material-symbols:event' },
      { id: 'collabs', label: 'Collabs', icon: 'material-symbols:handshake-outline', iconSelected: 'material-symbols:handshake' },
    ],
  },
];

export const CONTENT_TYPES: ContentType[] = CONTENT_TYPE_CATEGORIES.flatMap((c) => c.types);

export function findContentType(id: string): ContentType | undefined {
  return CONTENT_TYPES.find((c) => c.id === id);
}

/** The label to show (or send to the agents) for a stored content type */
export function contentTypeLabel(id: string): string {
  return findContentType(id)?.label ?? id;
}

/** Stored content types as id/label pairs, presets in catalog order, then the user's own */
export function contentTypeOptions(ids: string[]): { id: string; label: string }[] {
  const presets = CONTENT_TYPES.filter((c) => ids.includes(c.id));
  const custom = ids.filter((id) => !findContentType(id));
  return [...presets.map(({ id, label }) => ({ id, label })), ...custom.map((id) => ({ id, label: id }))];
}
