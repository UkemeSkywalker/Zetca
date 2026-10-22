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
  /** The local video file; null when editing (frames for thumbnails need it) */
  file: File | null;
  isShort: boolean;
  durationSeconds?: number;
  options: FormOptions;
  onPlaylistCreated: (playlist: YouTubePlaylist) => void;
  timeZones: string[];
  /** Set once the video has finished uploading (for transcript suggestions) */
  mediaId?: string;
  /** Editing a video that's already public: its publish time can't change */
  published?: boolean;
}
