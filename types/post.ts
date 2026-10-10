// types/post.ts
export interface Post {
  id: string;
  content: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  scheduledDate: Date;
  scheduledTime: string;
  status: 'scheduled' | 'published' | 'draft' | 'publishing' | 'failed';
  imageUrl?: string;
  mediaId?: string;
  mediaType?: 'image' | 'video';
  captionId?: string;
  createdAt: Date;
  publishedAt?: Date;
}
