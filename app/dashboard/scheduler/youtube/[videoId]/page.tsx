import { YouTubeVideoStatusPage } from '@/components/youtube/YouTubeVideoStatusPage';

export const metadata = { title: 'YouTube video | Zetca' };

export default async function YouTubeVideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  return <YouTubeVideoStatusPage videoId={videoId} />;
}
