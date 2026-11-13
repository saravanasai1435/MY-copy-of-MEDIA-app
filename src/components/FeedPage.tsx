import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Bookmark,
  Heart,
  MessageCircle,
  Radio,
  Share2,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { filterFeedPosts, formatCompactNumber, formatRelativeTime } from '../lib/formatters';
import type { Channel, Post, UserProfile } from '../types/pulsr';

interface FeedPageProps {
  posts: Post[];
  usersMap: Map<string, UserProfile>;
  channelsMap: Map<string, Channel>;
  currentUser: UserProfile;
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  followingIds: Set<string>;
  subscribedChannelIds: Set<string>;
  loading: boolean;
  error: string | null;
  onToggleLike: (post: Post) => void;
  onToggleSave: (post: Post) => void;
  onToggleFollow: (userId: string) => void;
  onToggleSubscribe: (channel: Channel) => void;
  onOpenComments: (post: Post) => void;
  onOpenProfile: (userId: string) => void;
  onOpenChannel: (channelId: string) => void;
  onSharePost: (post: Post) => void;
  onOpenCreate: () => void;
}

export function FeedPage({
  posts,
  usersMap,
  channelsMap,
  currentUser,
  likedPostIds,
  savedPostIds,
  followingIds,
  subscribedChannelIds,
  loading,
  error,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  onToggleSubscribe,
  onOpenComments,
  onOpenProfile,
  onOpenChannel,
  onSharePost,
  onOpenCreate,
}: FeedPageProps) {
  const reducedMotion = useReducedMotion();
  const [feedTab, setFeedTab] = useState<'all' | 'following' | 'subscriptions'>('all');
  const [visibleCount, setVisibleCount] = useState(4);
  const [loadingMore, setLoadingMore] = useState(false);
  const [burstPostId, setBurstPostId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filteredPosts = filterFeedPosts(
    posts,
    feedTab,
    followingIds,
    subscribedChannelIds,
    currentUser.uid
  );
  const displayedPosts = filteredPosts.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(4);
  }, [feedTab]);

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= filteredPosts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          setLoadingMore(true);
          window.setTimeout(() => {
            setVisibleCount((prev) => prev + 3);
            setLoadingMore(false);
          }, 350);
        }
      },
      { rootMargin: '160px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredPosts.length, loadingMore, visibleCount]);

  const handleDoubleTap = (post: Post) => {
    if (!likedPostIds.has(post.id)) {
      onToggleLike(post);
    }
    setBurstPostId(post.id);
    window.setTimeout(() => {
      setBurstPostId((curr) => (curr === post.id ? null : curr));
    }, 750);
  };

  const suggestedUsers = Array.from(usersMap.values())
    .filter((u) => u.uid !== currentUser.uid)
    .slice(0, 4);
  const featuredChannels = Array.from(channelsMap.values()).slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 lg:pt-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Feed Mode Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-2xl font-bold tracking-tight">Your Feed</h1>
            <div
              role="tablist"
              aria-label="Feed filter"
              className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/75 dark:bg-white/5 border border-slate-200 dark:border-white/10"
            >
              {(
                [
                  { id: 'all', label: 'For You' },
                  { id: 'following', label: 'Following' },
                  { id: 'subscriptions', label: 'Subscriptions' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={feedTab === tab.id}
                  type="button"
                  onClick={() => setFeedTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    feedTab === tab.id
                      ? 'bg-white dark:bg-[#191928] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-500 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              {[0, 1].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-4 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full skeleton-shimmer" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 w-32 rounded skeleton-shimmer" />
                      <div className="h-3 w-20 rounded skeleton-shimmer" />
                    </div>
                  </div>
                  <div className="aspect-[4/3] w-full rounded-xl skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : displayedPosts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-10 text-center">
              <p className="font-display text-lg font-semibold">
                {feedTab === 'subscriptions'
                  ? 'No subscribed channel posts yet'
                  : feedTab === 'following'
                  ? 'Follow creators to populate this feed'
                  : 'Your feed is ready for its first post'}
              </p>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Subscribe to Channels or share a new photo or video post.
              </p>
              <button
                type="button"
                onClick={onOpenCreate}
                className="mt-5 h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white text-sm font-semibold"
              >
                Create Post
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {displayedPosts.map((post, index) => {
                const author = usersMap.get(post.authorId) || currentUser;
                const channel = post.channelId ? channelsMap.get(post.channelId) : undefined;
                const isLiked = likedPostIds.has(post.id);
                const isSaved = savedPostIds.has(post.id);

                return (
                  <motion.article
                    key={post.id}
                    initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min(index * 0.06, 0.24),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#12121C]/90 backdrop-blur-md overflow-hidden shadow-sm"
                  >
                    {/* Author Header */}
                    <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(author.uid)}
                        className="flex items-center gap-3 min-w-0 text-left group"
                      >
                        <img
                          src={author.avatarUrl}
                          alt={author.displayName}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/15 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate group-hover:text-pink-500 transition-colors">
                            {author.displayName}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="truncate">@{author.username}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatRelativeTime(post.createdAt)}</span>
                          </div>
                        </div>
                      </button>

                      {channel && (
                        <button
                          type="button"
                          onClick={() => onOpenChannel(channel.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-300 hover:underline shrink-0"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>{channel.name}</span>
                        </button>
                      )}
                    </div>

                    {/* Media Surface (Double-tap to like) */}
                    <div
                      onDoubleClick={() => handleDoubleTap(post)}
                      className="relative bg-slate-950 select-none cursor-pointer overflow-hidden"
                    >
                      {post.mediaType === 'video' ? (
                        <video
                          src={post.mediaUrl}
                          controls
                          playsInline
                          className="w-full max-h-[540px] object-cover"
                        />
                      ) : (
                        <img
                          src={post.mediaUrl}
                          alt={post.caption.slice(0, 80)}
                          referrerPolicy="no-referrer"
                          className="w-full max-h-[540px] object-cover"
                        />
                      )}

                      {/* Double-Tap Heart Burst */}
                      <AnimatePresence>
                        {burstPostId === post.id && (
                          <motion.div
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{ scale: 1.25, opacity: 1 }}
                            exit={{ scale: 1.55, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                            className="pointer-events-none absolute inset-0 flex items-center justify-center"
                          >
                            <Heart className="w-24 h-24 text-pink-500 fill-pink-500 drop-shadow-[0_0_24px_rgba(236,72,153,0.75)]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Actions + Caption */}
                    <div className="px-4 py-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <motion.button
                            whileTap={reducedMotion ? undefined : { scale: 0.85 }}
                            type="button"
                            onClick={() => onToggleLike(post)}
                            aria-label={isLiked ? `Unlike post` : `Like post`}
                            className="min-h-[44px] px-2.5 rounded-xl flex items-center gap-1.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <Heart
                              className={`w-5 h-5 transition-colors ${
                                isLiked
                                  ? 'text-pink-500 fill-pink-500'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`}
                            />
                            <span className="tabular-nums text-xs font-semibold">
                              {formatCompactNumber(post.likesCount)}
                            </span>
                          </motion.button>

                          <button
                            type="button"
                            onClick={() => onOpenComments(post)}
                            aria-label="Open comments"
                            className="min-h-[44px] px-2.5 rounded-xl flex items-center gap-1.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <MessageCircle className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            <span className="tabular-nums text-xs font-semibold">
                              {formatCompactNumber(post.commentsCount)}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onSharePost(post)}
                            aria-label="Share post"
                            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <Share2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                          </button>
                        </div>

                        <motion.button
                          whileTap={reducedMotion ? undefined : { scale: 0.85 }}
                          type="button"
                          onClick={() => onToggleSave(post)}
                          aria-label={isSaved ? 'Remove from saved' : 'Save post'}
                          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <Bookmark
                            className={`w-5 h-5 transition-colors ${
                              isSaved
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          />
                        </motion.button>
                      </div>

                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                        <button
                          type="button"
                          onClick={() => onOpenProfile(author.uid)}
                          className="font-semibold mr-2 hover:underline"
                        >
                          {author.username}
                        </button>
                        {post.caption}
                      </p>
                    </div>
                  </motion.article>
                );
              })}

              {/* Infinite scroll sentinel & skeleton */}
              {visibleCount < filteredPosts.length && (
                <div ref={sentinelRef} className="py-4 space-y-4">
                  {loadingMore && (
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-4 space-y-3">
                      <div className="h-4 w-40 rounded skeleton-shimmer" />
                      <div className="h-48 w-full rounded-xl skeleton-shimmer" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Right Sidebar Rail */}
        <aside className="hidden lg:block lg:col-span-4 space-y-6 sticky top-8">
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#12121C]/90 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">Creators to follow</h2>
              <Sparkles className="w-4 h-4 text-pink-500" />
            </div>
            <div className="space-y-3">
              {suggestedUsers.map((creator) => {
                const isFollowing = followingIds.has(creator.uid);
                return (
                  <div key={creator.uid} className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(creator.uid)}
                      className="flex items-center gap-2.5 min-w-0 text-left"
                    >
                      <img
                        src={creator.avatarUrl}
                        alt={creator.displayName}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{creator.displayName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          @{creator.username}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleFollow(creator.uid)}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        isFollowing
                          ? 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'
                          : 'bg-gradient-to-r from-violet-600 to-pink-600 text-white'
                      }`}
                    >
                      {isFollowing ? (
                        'Following'
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <UserPlus className="w-3 h-3" /> Follow
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#12121C]/90 p-5 space-y-4">
            <h2 className="font-display text-sm font-bold">Featured Channels</h2>
            <div className="space-y-3">
              {featuredChannels.map((ch) => {
                const isSub = subscribedChannelIds.has(ch.id);
                return (
                  <div key={ch.id} className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenChannel(ch.id)}
                      className="flex items-center gap-2.5 min-w-0 text-left"
                    >
                      <img
                        src={ch.avatarUrl}
                        alt={ch.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{ch.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatCompactNumber(ch.subscribersCount)} subscribers
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleSubscribe(ch)}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        isSub
                          ? 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'
                          : 'border border-pink-500/40 text-pink-600 dark:text-pink-400 hover:bg-pink-500/10'
                      }`}
                    >
                      {isSub ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
