// types/user.ts
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  bio: string;
  avatarUrl?: string;
}

export interface ConnectedAccount {
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  isConnected: boolean;
  username?: string;
  connectedAt?: Date;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  width: number;
  height: number;
  createdAt: Date;
}
