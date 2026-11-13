import { useState } from 'react';
import { Hash, Heart, Search, Users } from 'lucide-react';
import { formatCompactNumber, searchExploreContent } from '../lib/formatters';
import type { Channel, Post, Shot, UserProfile } from '../types/pulsr';

interface ExplorePageProps {
  users: UserProfile[];
  channels: Channel[];
  posts: Post[];
  shots: Shot[];
  followingIds: Set<string>;
  currentUser: UserProfile;
  onOpenProfile: (userId: string) => void;
  onOpenChannel: (channelId: string) => void;
  onToggleFollow: (userId: string) => void;
  onOpenComments: (post: Post) => void;
}

export function ExplorePage({
  users,
  channels,
  posts,
  shots,
  followingIds,
  currentUser,
  onOpenProfile,
  onOpenChannel,
  onToggleFollow,
  onOpenComments,
}: ExplorePageProps) {
  const [queryText, setQueryText] = useState('');

  const results = searchExploreContent(queryText, users, channels, posts, shots);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 lg:pt-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Explore</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Search creators, channels, and trending hashtags.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search people, channels, #tags..."
            aria-label="Search explore"
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-[#12121C] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Hashtags Strip */}
      {results.hashtags.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold text-slate-500 dark:text-slate-400">
            Trending Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {results.hashtags.map((h) => (
              <button
                key={h.tag}
                type="button"
                onClick={() => setQueryText(`#${h.tag}`)}
                className="h-9 px-3.5 rounded-xl bg-white dark:bg-[#12121C] border border-slate-200 dark:border-white/10 text-xs font-semibold inline-flex items-center gap-1.5 hover:border-pink-500/60 transition-colors"
              >
                <Hash className="w-3.5 h-3.5 text-pink-500" />
                <span>{h.tag}</span>
                <span className="text-slate-400 tabular-nums">({h.count})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Matching Users & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-5 space-y-4">
          <h2 className="font-display text-base font-bold">Creators</h2>
          {results.users.length === 0 ? (
            <p className="text-sm text-slate-500">No creators match that search.</p>
          ) : (
            <div className="space-y-3">
              {results.users.map((u) => {
                const isSelf = u.uid === currentUser.uid;
                const isFollow = followingIds.has(u.uid);
                return (
                  <div key={u.uid} className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(u.uid)}
                      className="flex items-center gap-3 min-w-0 text-left"
                    >
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{u.displayName}</div>
                        <div className="text-xs text-slate-500 truncate">
                          @{u.username} · {formatCompactNumber(u.followersCount)} followers
                        </div>
                      </div>
                    </button>
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => onToggleFollow(u.uid)}
                        className={`h-8 px-3 rounded-lg text-xs font-semibold ${
                          isFollow
                            ? 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'
                            : 'bg-gradient-to-r from-violet-600 to-pink-600 text-white'
                        }`}
                      >
                        {isFollow ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-5 space-y-4">
          <h2 className="font-display text-base font-bold">Channels</h2>
          {results.channels.length === 0 ? (
            <p className="text-sm text-slate-500">No channels match that search.</p>
          ) : (
            <div className="space-y-3">
              {results.channels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpenChannel(c.id)}
                  className="w-full flex items-center justify-between gap-3 text-left p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{c.name}</div>
                      <div className="text-xs text-slate-500 truncate">{c.category}</div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 inline-flex items-center gap-1 tabular-nums shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    {formatCompactNumber(c.subscribersCount)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Trending Media Grid */}
      <section className="space-y-4">
        <h2 className="font-display text-base font-bold">Trending Posts</h2>
        {results.posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-10 text-center text-sm text-slate-500">
            No matching posts found.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {results.posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onOpenComments(post)}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/70 dark:border-white/10 text-left"
              >
                <img
                  src={post.mediaUrl}
                  alt={post.caption.slice(0, 60)}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-white">
                  <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
                    <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
                    <span>{formatCompactNumber(post.likesCount)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
