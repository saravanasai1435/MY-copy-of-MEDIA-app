import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Check, Loader2, Plus, Radio, Search, Upload, Users, X } from 'lucide-react';
import { formatCompactNumber, formatRelativeTime, sanitizeUsername } from '../lib/formatters';
import { compressImageFile } from '../lib/imageCompression';
import { makeId, uploadMediaWithProgress } from '../services/dataService';
import type { Channel, Post, UserProfile } from '../types/pulsr';

interface ChannelsPageProps {
  channels: Channel[];
  posts: Post[];
  usersMap: Map<string, UserProfile>;
  currentUser: UserProfile;
  subscribedChannelIds: Set<string>;
  selectedChannelId: string | null;
  isDemoMode: boolean;
  onSelectChannel: (channelId: string | null) => void;
  onToggleSubscribe: (channel: Channel) => void;
  onCreateChannel: (channel: Channel) => Promise<void>;
  onOpenCreateChannelPost: () => void;
  onToast: (msg: string, tone?: 'info' | 'success' | 'error') => void;
}

const CATEGORIES = ['All', 'Music & Audio', 'Photography', 'Design', 'Tech', 'Film'];

export function ChannelsPage({
  channels,
  posts,
  usersMap,
  currentUser,
  subscribedChannelIds,
  selectedChannelId,
  isDemoMode,
  onSelectChannel,
  onToggleSubscribe,
  onCreateChannel,
  onOpenCreateChannelPost,
  onToast,
}: ChannelsPageProps) {
  const reducedMotion = useReducedMotion();
  const [viewTab, setViewTab] = useState<'discover' | 'subscriptions'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [createOpen, setCreateOpen] = useState(false);

  // Create Channel form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Music & Audio');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [bannerBlob, setBannerBlob] = useState<Blob | null>(null);
  const [creating, setCreating] = useState(false);

  const selectedChannel = selectedChannelId
    ? channels.find((c) => c.id === selectedChannelId) || null
    : null;

  const filteredChannels = channels.filter((c) => {
    const matchesCat = categoryFilter === 'All' || c.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.handle.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const subscribedPosts = posts.filter(
    (p) => Boolean(p.channelId) && subscribedChannelIds.has(p.channelId!)
  );

  const handleImagePick = async (file: File | undefined, kind: 'avatar' | 'banner') => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, kind === 'avatar' ? 400 : 1200, 0.84);
      if (kind === 'avatar') {
        setAvatarBlob(compressed.blob);
        setAvatarUrl(compressed.previewUrl);
      } else {
        setBannerBlob(compressed.blob);
        setBannerUrl(compressed.previewUrl);
      }
    } catch {
      onToast('Could not read image.', 'error');
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      onToast('Channel name must be at least 2 characters.', 'error');
      return;
    }
    setCreating(true);
    try {
      const chId = makeId('ch');
      let finalAvatar = avatarUrl;
      let finalBanner = bannerUrl;

      if (!isDemoMode && avatarBlob) {
        finalAvatar = await uploadMediaWithProgress(
          `channels/${currentUser.uid}/${chId}_avatar.jpg`,
          avatarBlob,
          () => {},
          avatarUrl
        );
      }
      if (!isDemoMode && bannerBlob) {
        finalBanner = await uploadMediaWithProgress(
          `channels/${currentUser.uid}/${chId}_banner.jpg`,
          bannerBlob,
          () => {},
          bannerUrl
        );
      }

      if (!finalAvatar) {
        finalAvatar = currentUser.avatarUrl;
      }
      if (!finalBanner) {
        finalBanner = '/src/assets/images/channel_synth_banner_1794581774847.jpg';
      }

      const nowIso = new Date().toISOString();
      const channel: Channel = {
        id: chId,
        ownerId: currentUser.uid,
        name: name.trim(),
        handle: sanitizeUsername(name) || `channel${Date.now().toString().slice(-4)}`,
        description: description.trim(),
        category,
        avatarUrl: finalAvatar,
        bannerUrl: finalBanner,
        subscribersCount: 1,
        postsCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await onCreateChannel(channel);
      onToast(`Channel "${channel.name}" created!`, 'success');
      setCreateOpen(false);
      setName('');
      setDescription('');
      setAvatarUrl('');
      setBannerUrl('');
      setAvatarBlob(null);
      setBannerBlob(null);
    } catch {
      onToast('Failed to create channel.', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (selectedChannel) {
    const channelPosts = posts.filter((p) => p.channelId === selectedChannel.id);
    const isSub = subscribedChannelIds.has(selectedChannel.id);
    const isOwner = selectedChannel.ownerId === currentUser.uid;

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 lg:pt-8 space-y-6">
        <button
          type="button"
          onClick={() => onSelectChannel(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Channels</span>
        </button>

        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C]">
          <div className="h-44 sm:h-56 bg-slate-900 relative">
            <img
              src={selectedChannel.bannerUrl}
              alt={selectedChannel.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          </div>

          <div className="px-6 pb-6 -mt-10 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <img
                src={selectedChannel.avatarUrl}
                alt={selectedChannel.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-[#12121C] bg-slate-900 shrink-0"
              />
              <div className="pt-10 sm:pt-0">
                <h1 className="font-display text-2xl font-bold">{selectedChannel.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>@{selectedChannel.handle}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedChannel.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums font-medium">
                    {formatCompactNumber(selectedChannel.subscribersCount)} subscribers
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  type="button"
                  onClick={onOpenCreateChannelPost}
                  className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Publish to Channel
                </button>
              )}
              <motion.button
                whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                type="button"
                onClick={() => onToggleSubscribe(selectedChannel)}
                className={`h-10 px-5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isSub
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white'
                    : 'bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white'
                }`}
              >
                {isSub && <Check className="w-4 h-4" />}
                <span>{isSub ? 'Subscribed' : 'Subscribe'}</span>
              </motion.button>
            </div>
          </div>

          {selectedChannel.description && (
            <p className="px-6 pb-6 text-sm text-slate-600 dark:text-slate-300">
              {selectedChannel.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {channelPosts.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-10 text-center text-sm text-slate-500">
              No posts published in this channel yet.
            </div>
          ) : (
            channelPosts.map((post) => {
              const author = usersMap.get(post.authorId) || currentUser;
              return (
                <article
                  key={post.id}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] overflow-hidden"
                >
                  <img
                    src={post.mediaUrl}
                    alt={post.caption.slice(0, 60)}
                    referrerPolicy="no-referrer"
                    className="w-full h-56 object-cover"
                  />
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {author.displayName}
                      </span>
                      <span>{formatRelativeTime(post.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{post.caption}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 lg:pt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Channels</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Subscribe to creator hubs or launch your own channel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create Channel</span>
        </button>
      </div>

      {/* Discover vs Subscriptions Tab */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/75 dark:bg-white/5 border border-slate-200 dark:border-white/10"
        >
          <button
            role="tab"
            aria-selected={viewTab === 'discover'}
            type="button"
            onClick={() => setViewTab('discover')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewTab === 'discover'
                ? 'bg-white dark:bg-[#191928] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Discover Channels
          </button>
          <button
            role="tab"
            aria-selected={viewTab === 'subscriptions'}
            type="button"
            onClick={() => setViewTab('subscriptions')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewTab === 'subscriptions'
                ? 'bg-white dark:bg-[#191928] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Subscriptions Feed ({subscribedPosts.length})
          </button>
        </div>

        {viewTab === 'discover' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels..."
              aria-label="Search channels"
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-[#12121C] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        )}
      </div>

      {viewTab === 'discover' ? (
        <>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChannels.map((ch) => {
              const isSub = subscribedChannelIds.has(ch.id);
              return (
                <div
                  key={ch.id}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] overflow-hidden flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <button
                      type="button"
                      onClick={() => onSelectChannel(ch.id)}
                      className="block w-full text-left"
                    >
                      <div className="h-32 bg-slate-900 overflow-hidden">
                        <img
                          src={ch.bannerUrl}
                          alt={ch.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="px-4 pb-3 -mt-7 relative">
                        <img
                          src={ch.avatarUrl}
                          alt={ch.name}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-xl object-cover border-2 border-white dark:border-[#12121C] bg-slate-900"
                        />
                        <h2 className="mt-2 font-display text-lg font-bold">{ch.name}</h2>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{ch.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Users className="w-3.5 h-3.5" />
                            {formatCompactNumber(ch.subscribersCount)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {ch.description}
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="px-4 pb-4 pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectChannel(ch.id)}
                      className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold transition-colors"
                    >
                      Open
                    </button>
                    <motion.button
                      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                      type="button"
                      onClick={() => onToggleSubscribe(ch)}
                      className={`flex-1 h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        isSub
                          ? 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white'
                          : 'bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white'
                      }`}
                    >
                      {isSub && <Check className="w-3.5 h-3.5" />}
                      <span>{isSub ? 'Subscribed' : 'Subscribe'}</span>
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : subscribedPosts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-10 text-center">
          <Radio className="w-8 h-8 text-pink-500 mx-auto mb-3" />
          <h2 className="font-display text-lg font-bold">No channel subscriptions yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Subscribe to any channel in Discover to see their combined feed here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscribedPosts.map((post) => {
            const ch = channels.find((c) => c.id === post.channelId);
            return (
              <article
                key={post.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] overflow-hidden"
              >
                <img
                  src={post.mediaUrl}
                  alt={post.caption.slice(0, 60)}
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover"
                />
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-pink-500">{ch?.name || 'Channel'}</span>
                    <span>{formatRelativeTime(post.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{post.caption}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Channel Modal */}
      <AnimatePresence>
        {createOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Create Channel"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.form
              initial={reducedMotion ? false : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reducedMotion ? undefined : { y: 40, opacity: 0 }}
              onSubmit={handleCreateSubmit}
              className="relative z-10 w-full sm:max-w-lg bg-white dark:bg-[#12121D] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Create a Channel</h2>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  aria-label="Close modal"
                  className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-1">
                  Channel name
                </label>
                <input
                  type="text"
                  required
                  maxLength={64}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Modular Frequencies"
                  className="w-full h-11 px-4 rounded-xl bg-slate-100 dark:bg-[#0B0B12] border border-slate-200 dark:border-white/10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-[#0B0B12] border border-slate-200 dark:border-white/10 text-sm"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-3 text-center text-xs hover:border-pink-500">
                  <Upload className="w-4 h-4 mx-auto mb-1 text-pink-500" />
                  <span>{avatarUrl ? 'Avatar selected' : 'Upload Avatar'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleImagePick(e.target.files?.[0], 'avatar')}
                  />
                </label>
                <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-3 text-center text-xs hover:border-pink-500">
                  <Upload className="w-4 h-4 mx-auto mb-1 text-violet-500" />
                  <span>{bannerUrl ? 'Banner selected' : 'Upload Banner'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleImagePick(e.target.files?.[0], 'banner')}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  maxLength={400}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you share in this channel?"
                  className="w-full p-3.5 rounded-xl bg-slate-100 dark:bg-[#0B0B12] border border-slate-200 dark:border-white/10 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Create Channel</span>
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
