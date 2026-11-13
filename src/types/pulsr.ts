export type ThemeMode = 'dark' | 'light';

export type NavTab =
  | 'home'
  | 'shots'
  | 'channels'
  | 'messages'
  | 'explore'
  | 'notifications'
  | 'profile'
  | 'by-dev';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isOnline: boolean;
  onboarded?: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  channelId?: string | null;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Shot {
  id: string;
  authorId: string;
  channelId?: string | null;
  caption: string;
  videoUrl: string;
  posterUrl?: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  durationSec?: number;
  /** Used for procedural canvas-backed demo shots so playback never 404s */
  demoScene?: 'waveform' | 'aurora' | 'prism';
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  targetType: 'post' | 'shot';
  targetId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  ownerId: string;
  name: string;
  handle: string;
  description: string;
  category: string;
  avatarUrl: string;
  bannerUrl: string;
  subscribersCount: number;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage: string;
  lastSenderId: string;
  lastMessageAt: string;
  unreadBy: Record<string, number>;
  typingBy: Record<string, boolean>;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  type: 'text' | 'image' | 'call';
  callStatus?: 'missed' | 'declined' | 'ended' | 'busy';
  callDurationSec?: number;
  readBy: string[];
  createdAt: string;
}

export type CallStatus =
  | 'ringing'
  | 'accepted'
  | 'declined'
  | 'busy'
  | 'missed'
  | 'ended';

export interface VoiceCallSession {
  id: string;
  callerId: string;
  calleeId: string;
  conversationId: string;
  status: CallStatus;
  offer?: { type: string; sdp: string };
  answer?: { type: string; sdp: string };
  durationSec?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string;
  type: 'like' | 'comment' | 'follow' | 'subscribe' | 'missed_call';
  targetId?: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}
