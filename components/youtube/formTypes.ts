import type { DetailsDraft } from '@/lib/youtube/draft';
import type { YouTubeCategory, YouTubePlaylist } from '@/lib/api/youtubeApi';

export interface FormOptions {
  playlists: YouTubePlaylist[];
  categories: YouTubeCategory[];
  loading: boolean;
  error: string | null;
}

export interface DetailsFormProps {
  draft: DetailsDraft;
  update: (patch: Partial<DetailsDraft>) => void;
  errors: Record<string, string>;
  file: File;
  isShort: boolean;
  durationSeconds?: number;
  options: FormOptions;
  onPlaylistCreated: (playlist: YouTubePlaylist) => void;
  timeZones: string[];
  /** Set once the video has finished uploading (for transcript suggestions) */
  mediaId?: string;
}
