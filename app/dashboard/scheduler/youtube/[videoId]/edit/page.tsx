import { EditYouTubeVideo } from '@/components/youtube/EditYouTubeVideo';

export const metadata = { title: 'Edit YouTube video | Zetca' };

export default async function EditYouTubeVideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  return <EditYouTubeVideo videoId={videoId} />;
}
