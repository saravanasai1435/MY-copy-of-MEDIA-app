import type { Channel, Post, Shot, UserProfile } from '../types/pulsr';

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0';
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(Math.floor(value));
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatRelativeTime(isoDate: string, nowMs = Date.now()): string {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return 'Just now';
  const diffSec = Math.max(0, Math.floor((nowMs - parsed) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(parsed).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]{2,30}/g) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of matches) {
    const clean = tag.slice(1).toLowerCase();
    if (!seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
    if (result.length >= 15) break;
  }
  return result;
}

export function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 32);
}

export function buildConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('__');
}

export function filterFeedPosts(
  posts: Post[],
  mode: 'all' | 'following' | 'subscriptions',
  followingIds: Set<string>,
  subscribedChannelIds: Set<string>,
  currentUserId?: string
): Post[] {
  if (mode === 'all') return posts;
  if (mode === 'subscriptions') {
    return posts.filter(
      (post) => Boolean(post.channelId) && subscribedChannelIds.has(post.channelId!)
    );
  }
  return posts.filter(
    (post) =>
      post.authorId === currentUserId ||
      followingIds.has(post.authorId) ||
      (Boolean(post.channelId) && subscribedChannelIds.has(post.channelId!))
  );
}

export interface ExploreSearchResults {
  users: UserProfile[];
  channels: Channel[];
  hashtags: { tag: string; count: number }[];
  posts: Post[];
}

export function searchExploreContent(
  query: string,
  users: UserProfile[],
  channels: Channel[],
  posts: Post[],
  shots: Shot[]
): ExploreSearchResults {
  const q = query.trim().toLowerCase().replace(/^#/, '');

  const tagCounts = new Map<string, number>();
  for (const p of posts) {
    for (const tag of p.hashtags) {
      tagCounts.set(tag.toLowerCase(), (tagCounts.get(tag.toLowerCase()) ?? 0) + 1);
    }
  }
  for (const s of shots) {
    for (const tag of s.hashtags) {
      tagCounts.set(tag.toLowerCase(), (tagCounts.get(tag.toLowerCase()) ?? 0) + 1);
    }
  }

  const allTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  if (!q) {
    return {
      users,
      channels,
      hashtags: allTags.slice(0, 12),
      posts,
    };
  }

  return {
    users: users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.bio.toLowerCase().includes(q)
    ),
    channels: channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    ),
    hashtags: allTags.filter((h) => h.tag.includes(q)),
    posts: posts.filter(
      (p) =>
        p.caption.toLowerCase().includes(q) ||
        p.hashtags.some((h) => h.toLowerCase().includes(q))
    ),
  };
}
