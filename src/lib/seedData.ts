import type {
  AppNotification,
  Channel,
  ChatMessage,
  Comment,
  Conversation,
  Post,
  Shot,
  UserProfile,
} from '../types/pulsr';

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

function svgAvatar(initials: string, c1: string, c2: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g)"/><text x="60" y="68" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-size="40" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEMO_CURRENT_USER: UserProfile = {
  uid: 'demo_viewer',
  username: 'alex.pulse',
  displayName: 'Alex Mercer',
  bio: 'Sound designer, street photographer & creator exploring PULSR.',
  avatarUrl: svgAvatar('AM', '#8B5CF6', '#EC4899'),
  followersCount: 1420,
  followingCount: 184,
  postsCount: 2,
  isOnline: true,
  onboarded: true,
  lastSeen: minsAgo(1),
  createdAt: hoursAgo(240),
  updatedAt: minsAgo(1),
};

export const SEED_USERS: UserProfile[] = [
  {
    uid: 'user_saravana',
    username: 'saravanasai',
    displayName: 'Saravanasai',
    bio: 'Building embedded systems, hardware synths, and web experiences.',
    avatarUrl: svgAvatar('SS', '#8B5CF6', '#F59E0B'),
    followersCount: 12840,
    followingCount: 312,
    postsCount: 48,
    isOnline: true,
    onboarded: true,
    lastSeen: minsAgo(2),
    createdAt: hoursAgo(720),
    updatedAt: minsAgo(2),
  },
  {
    uid: 'user_kenji',
    username: 'kenji.frames',
    displayName: 'Kenji Sato',
    bio: '35mm night walks in Shimokitazawa. Chasing neon & rain.',
    avatarUrl: svgAvatar('KS', '#EC4899', '#8B5CF6'),
    followersCount: 8490,
    followingCount: 210,
    postsCount: 64,
    isOnline: true,
    onboarded: true,
    lastSeen: minsAgo(4),
    createdAt: hoursAgo(600),
    updatedAt: minsAgo(4),
  },
  {
    uid: 'user_claire',
    username: 'claire.studio',
    displayName: 'Claire Moreau',
    bio: 'Industrial designer & analog audio hardware collector.',
    avatarUrl: svgAvatar('CM', '#F59E0B', '#EC4899'),
    followersCount: 5320,
    followingCount: 195,
    postsCount: 31,
    isOnline: false,
    onboarded: true,
    lastSeen: hoursAgo(2),
    createdAt: hoursAgo(500),
    updatedAt: hoursAgo(2),
  },
  {
    uid: 'user_elena',
    username: 'elena.peaks',
    displayName: 'Elena Rossi',
    bio: 'Alpine trail runner and golden-hour landscape filmmaker.',
    avatarUrl: svgAvatar('ER', '#6366F1', '#EC4899'),
    followersCount: 19200,
    followingCount: 140,
    postsCount: 87,
    isOnline: true,
    onboarded: true,
    lastSeen: minsAgo(9),
    createdAt: hoursAgo(800),
    updatedAt: minsAgo(9),
  },
];

export const SEED_CHANNELS: Channel[] = [
  {
    id: 'ch_soundcraft',
    ownerId: 'user_saravana',
    name: 'Soundcraft Lab',
    handle: 'soundcraft',
    description: 'Weekly modular synth patches, acoustic experiments, and DSP breakdowns.',
    category: 'Music & Audio',
    avatarUrl: svgAvatar('SL', '#8B5CF6', '#F59E0B'),
    bannerUrl: '/src/assets/images/channel_synth_banner_1794581774847.jpg',
    subscribersCount: 4820,
    postsCount: 24,
    createdAt: hoursAgo(500),
    updatedAt: minsAgo(18),
  },
  {
    id: 'ch_framelight',
    ownerId: 'user_kenji',
    name: 'Frame & Light',
    handle: 'framelight',
    description: 'Anamorphic glass tests, rainy street photography, and grading notes.',
    category: 'Photography',
    avatarUrl: svgAvatar('FL', '#EC4899', '#6366F1'),
    bannerUrl: '/src/assets/images/channel_lens_banner_1794581774546.jpg',
    subscribersCount: 6190,
    postsCount: 39,
    createdAt: hoursAgo(450),
    updatedAt: hoursAgo(1),
  },
  {
    id: 'ch_atelier',
    ownerId: 'user_claire',
    name: 'Atelier Objects',
    handle: 'atelier',
    description: 'Tactile hardware, desk setups, and industrial design craft.',
    category: 'Design',
    avatarUrl: svgAvatar('AO', '#F59E0B', '#8B5CF6'),
    bannerUrl: '/src/assets/images/post_minimal_desk_1794581773302.jpg',
    subscribersCount: 3150,
    postsCount: 17,
    createdAt: hoursAgo(380),
    updatedAt: hoursAgo(4),
  },
];

export const SEED_POSTS: Post[] = [
  {
    id: 'post_synth_session',
    authorId: 'user_saravana',
    channelId: 'ch_soundcraft',
    caption:
      'Late-night patch session running warm analog sub-oscillators through a custom bucket-brigade delay. #synth #soundcraft #analog',
    mediaUrl: '/src/assets/images/post_neon_studio_1794581773083.jpg',
    mediaType: 'image',
    hashtags: ['synth', 'soundcraft', 'analog'],
    likesCount: 428,
    commentsCount: 2,
    createdAt: minsAgo(24),
    updatedAt: minsAgo(24),
  },
  {
    id: 'post_tokyo_alley',
    authorId: 'user_kenji',
    channelId: 'ch_framelight',
    caption:
      'Blue hour drizzle in Shimokitazawa. Shot wide open on a vintage 35mm f/1.4 prime. #tokyorain #35mm #streetphotography',
    mediaUrl: '/src/assets/images/post_tokyo_rain_1794581773066.jpg',
    mediaType: 'image',
    hashtags: ['tokyorain', '35mm', 'streetphotography'],
    likesCount: 892,
    commentsCount: 1,
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'post_desk_craft',
    authorId: 'user_claire',
    channelId: 'ch_atelier',
    caption:
      'Morning shadows across machined aluminum and walnut. Sketching a tactile rotary controller for audio workflows. #industrialdesign #desksetup #atelier',
    mediaUrl: '/src/assets/images/post_minimal_desk_1794581773302.jpg',
    mediaType: 'image',
    hashtags: ['industrialdesign', 'desksetup', 'atelier'],
    likesCount: 315,
    commentsCount: 1,
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(5),
  },
  {
    id: 'post_dolomites_ridge',
    authorId: 'user_elena',
    channelId: null,
    caption:
      'Above the cloud inversion at 2,400m just as the first amber light hit the Dolomites ridge. #dolomites #alpine #goldenhour',
    mediaUrl: '/src/assets/images/post_mountain_ridge_1794581773947.jpg',
    mediaType: 'image',
    hashtags: ['dolomites', 'alpine', 'goldenhour'],
    likesCount: 1240,
    commentsCount: 1,
    createdAt: hoursAgo(9),
    updatedAt: hoursAgo(9),
  },
];

export const SEED_SHOTS: Shot[] = [
  {
    id: 'shot_harmonic_wave',
    authorId: 'user_saravana',
    channelId: 'ch_soundcraft',
    caption: 'Live harmonic pulse synthesis at 124 BPM — headphones recommended. #shots #synth #pulsr',
    videoUrl: '',
    posterUrl: '/src/assets/images/post_neon_studio_1794581773083.jpg',
    hashtags: ['shots', 'synth', 'pulsr'],
    likesCount: 1420,
    commentsCount: 2,
    viewsCount: 18400,
    durationSec: 18,
    demoScene: 'waveform',
    createdAt: minsAgo(45),
    updatedAt: minsAgo(45),
  },
  {
    id: 'shot_neon_rain',
    authorId: 'user_kenji',
    channelId: 'ch_framelight',
    caption: 'Rain reflections & amber lantern bokeh on 35mm motion film. #tokyorain #cinema #nightwalk',
    videoUrl: '',
    posterUrl: '/src/assets/images/post_tokyo_rain_1794581773066.jpg',
    hashtags: ['tokyorain', 'cinema', 'nightwalk'],
    likesCount: 2310,
    commentsCount: 1,
    viewsCount: 31200,
    durationSec: 15,
    demoScene: 'aurora',
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
  },
  {
    id: 'shot_prism_ridge',
    authorId: 'user_elena',
    channelId: null,
    caption: 'Summit ridge timelapses & kinetic atmosphere study. #alpine #timelapse #goldenhour',
    videoUrl: '',
    posterUrl: '/src/assets/images/post_mountain_ridge_1794581773947.jpg',
    hashtags: ['alpine', 'timelapse', 'goldenhour'],
    likesCount: 980,
    commentsCount: 1,
    viewsCount: 12900,
    durationSec: 22,
    demoScene: 'prism',
    createdAt: hoursAgo(7),
    updatedAt: hoursAgo(7),
  },
];

export const SEED_COMMENTS: Comment[] = [
  {
    id: 'c_1',
    targetType: 'post',
    targetId: 'post_synth_session',
    authorId: 'user_claire',
    text: 'That warm analog saturation around the filter sweep is unreal.',
    createdAt: minsAgo(18),
  },
  {
    id: 'c_2',
    targetType: 'post',
    targetId: 'post_synth_session',
    authorId: 'user_kenji',
    text: 'Need this stem for the next Shimokitazawa night walk edit!',
    createdAt: minsAgo(11),
  },
  {
    id: 'c_3',
    targetType: 'post',
    targetId: 'post_tokyo_alley',
    authorId: 'user_elena',
    text: 'The lantern reflection gradient on wet stone looks painted.',
    createdAt: hoursAgo(1),
  },
  {
    id: 'c_4',
    targetType: 'shot',
    targetId: 'shot_harmonic_wave',
    authorId: 'user_kenji',
    text: 'Cleanest visual pulse sync I have seen all week.',
    createdAt: minsAgo(30),
  },
];

export function buildSeedConversations(currentUid: string): Conversation[] {
  return [
    {
      id: [currentUid, 'user_saravana'].sort().join('__'),
      participantIds: [currentUid, 'user_saravana'],
      lastMessage: 'Just pushed the new synth patch — hop on a voice call when ready!',
      lastSenderId: 'user_saravana',
      lastMessageAt: minsAgo(6),
      unreadBy: { [currentUid]: 1, user_saravana: 0 },
      typingBy: {},
      updatedAt: minsAgo(6),
    },
    {
      id: [currentUid, 'user_kenji'].sort().join('__'),
      participantIds: [currentUid, 'user_kenji'],
      lastMessage: 'Sent over the 35mm grading LUTs.',
      lastSenderId: 'user_kenji',
      lastMessageAt: hoursAgo(2),
      unreadBy: { [currentUid]: 0, user_kenji: 0 },
      typingBy: {},
      updatedAt: hoursAgo(2),
    },
  ];
}

export function buildSeedMessages(currentUid: string): Record<string, ChatMessage[]> {
  const conv1 = [currentUid, 'user_saravana'].sort().join('__');
  const conv2 = [currentUid, 'user_kenji'].sort().join('__');
  return {
    [conv1]: [
      {
        id: 'm_1',
        senderId: 'user_saravana',
        text: 'Hey! Loved your latest post on the feed.',
        type: 'text',
        readBy: ['user_saravana', currentUid],
        createdAt: minsAgo(25),
      },
      {
        id: 'm_2',
        senderId: currentUid,
        text: 'Thanks! The analog drum loop in Soundcraft Lab sounded crisp.',
        type: 'text',
        readBy: [currentUid, 'user_saravana'],
        createdAt: minsAgo(15),
      },
      {
        id: 'm_3',
        senderId: 'user_saravana',
        text: 'Just pushed the new synth patch — hop on a voice call when ready!',
        type: 'text',
        readBy: ['user_saravana'],
        createdAt: minsAgo(6),
      },
    ],
    [conv2]: [
      {
        id: 'm_4',
        senderId: 'user_kenji',
        text: 'Sent over the 35mm grading LUTs.',
        type: 'text',
        readBy: ['user_kenji', currentUid],
        createdAt: hoursAgo(2),
      },
    ],
  };
}

export function buildSeedNotifications(currentUid: string): AppNotification[] {
  return [
    {
      id: 'n_1',
      recipientId: currentUid,
      actorId: 'user_saravana',
      type: 'like',
      targetId: 'post_synth_session',
      text: 'Saravanasai liked your photo.',
      read: false,
      createdAt: minsAgo(8),
    },
    {
      id: 'n_2',
      recipientId: currentUid,
      actorId: 'user_kenji',
      type: 'follow',
      text: 'Kenji Sato started following you.',
      read: false,
      createdAt: minsAgo(32),
    },
    {
      id: 'n_3',
      recipientId: currentUid,
      actorId: 'user_claire',
      type: 'subscribe',
      targetId: 'ch_soundcraft',
      text: 'Claire Moreau subscribed to Soundcraft Lab.',
      read: true,
      createdAt: hoursAgo(3),
    },
  ];
}
