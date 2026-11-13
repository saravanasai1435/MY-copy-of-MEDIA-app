import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConversationId,
  extractHashtags,
  filterFeedPosts,
  formatCompactNumber,
  formatDuration,
  formatRelativeTime,
  sanitizeUsername,
  searchExploreContent,
} from './formatters';
import type { Channel, Post, Shot, UserProfile } from '../types/pulsr';

test('formatCompactNumber formats thousands and millions cleanly', () => {
  assert.equal(formatCompactNumber(0), '0');
  assert.equal(formatCompactNumber(999), '999');
  assert.equal(formatCompactNumber(1200), '1.2K');
  assert.equal(formatCompactNumber(2000), '2K');
  assert.equal(formatCompactNumber(1500000), '1.5M');
});

test('formatDuration formats mm:ss', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(9), '00:09');
  assert.equal(formatDuration(134), '02:14');
});

test('formatRelativeTime computes human elapsed labels', () => {
  const now = Date.UTC(2026, 10, 13, 12, 0, 0);
  assert.equal(formatRelativeTime(new Date(now - 20_000).toISOString(), now), 'Just now');
  assert.equal(formatRelativeTime(new Date(now - 5 * 60_000).toISOString(), now), '5m');
  assert.equal(formatRelativeTime(new Date(now - 3 * 3600_000).toISOString(), now), '3h');
  assert.equal(formatRelativeTime(new Date(now - 2 * 86400_000).toISOString(), now), '2d');
});

test('extractHashtags deduplicates and normalizes tags', () => {
  assert.deepEqual(
    extractHashtags('Late night #SynthJam & #TokyoRain #synthjam #3d'),
    ['synthjam', 'tokyorain', '3d']
  );
});

test('sanitizeUsername strips invalid chars and enforces lowercase', () => {
  assert.equal(sanitizeUsername('@Sara_Dev!! 99'), 'sara_dev99');
});

test('buildConversationId produces deterministic sorted key', () => {
  assert.equal(buildConversationId('user_b', 'user_a'), 'user_a__user_b');
  assert.equal(buildConversationId('user_a', 'user_b'), 'user_a__user_b');
});

test('filterFeedPosts filters by following and subscriptions accurately', () => {
  const samplePosts: Post[] = [
    {
      id: 'p1',
      authorId: 'u1',
      channelId: null,
      caption: 'One',
      mediaUrl: 'x',
      mediaType: 'image',
      hashtags: [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'p2',
      authorId: 'u2',
      channelId: 'ch1',
      caption: 'Two',
      mediaUrl: 'x',
      mediaType: 'image',
      hashtags: [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'p3',
      authorId: 'u3',
      channelId: null,
      caption: 'Three',
      mediaUrl: 'x',
      mediaType: 'image',
      hashtags: [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const following = new Set(['u1']);
  const subs = new Set(['ch1']);

  assert.deepEqual(
    filterFeedPosts(samplePosts, 'subscriptions', following, subs, 'me').map((p) => p.id),
    ['p2']
  );
  assert.deepEqual(
    filterFeedPosts(samplePosts, 'following', following, subs, 'me').map((p) => p.id),
    ['p1', 'p2']
  );
});

test('searchExploreContent matches users, channels, and hashtags', () => {
  const users: UserProfile[] = [
    {
      uid: 'u1',
      username: 'saravana',
      displayName: 'Saravanasai',
      bio: 'Audio & embedded systems',
      avatarUrl: '',
      followersCount: 10,
      followingCount: 5,
      postsCount: 2,
      isOnline: true,
      lastSeen: '',
      createdAt: '',
      updatedAt: '',
    },
  ];
  const channels: Channel[] = [
    {
      id: 'ch1',
      ownerId: 'u1',
      name: 'Soundcraft Lab',
      handle: 'soundcraft',
      description: 'Analog synth sessions',
      category: 'Music',
      avatarUrl: '',
      bannerUrl: '',
      subscribersCount: 50,
      postsCount: 4,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const posts: Post[] = [
    {
      id: 'p1',
      authorId: 'u1',
      caption: 'Patching modular filters',
      mediaUrl: '',
      mediaType: 'image',
      hashtags: ['synth', 'analog'],
      likesCount: 2,
      commentsCount: 0,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const shots: Shot[] = [];

  const res = searchExploreContent('#synth', users, channels, posts, shots);
  assert.equal(res.hashtags.length, 1);
  assert.equal(res.hashtags[0].tag, 'synth');
  assert.equal(res.posts.length, 1);
  assert.equal(res.channels.length, 1);
});
