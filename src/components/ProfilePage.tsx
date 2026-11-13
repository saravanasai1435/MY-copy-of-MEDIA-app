import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Bookmark,
  Code2,
  Edit3,
  Film,
  Grid,
  Loader2,
  LogOut,
  MessageCircle,
  Moon,
  Sun,
  Upload,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { formatCompactNumber, sanitizeUsername } from '../lib/formatters';
import { compressImageFile } from '../lib/imageCompression';
import { uploadMediaWithProgress } from '../services/dataService';
import type { Post, Shot, ThemeMode, UserProfile } from '../types/pulsr';

interface ProfilePageProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  posts: Post[];
  shots: Shot[];
  savedPosts: Post[];
  theme: ThemeMode;
  isDemoMode: boolean;
  onToggleTheme: () => void;
  onToggleFollow: (userId: string) => void;
  onStartChat: (userId: string) => void;
  onSaveProfile: (updated: UserProfile) => Promise<void>;
  onOpenByDev: () => void;
  onOpenComments: (post: Post) => void;
  onOpenShots: () => void;
  onSignOut: () => void;
  onBackToOwnProfile: () => void;
  onToast: (msg: string, tone?: 'info' | 'success' | 'error') => void;
}

export function ProfilePage({
  profile,
  isOwnProfile,
  isFollowing,
  posts,
  shots,
  savedPosts,
  theme,
  isDemoMode,
  onToggleTheme,
  onToggleFollow,
  onStartChat,
  onSaveProfile,
  onOpenByDev,
  onOpenComments,
  onOpenShots,
  onSignOut,
  onBackToOwnProfile,
  onToast,
}: ProfilePageProps) {
  const reducedMotion = useReducedMotion();
  const [tab, setTab] = useState<'posts' | 'shots' | 'saved'>('posts');
  const [editOpen, setEditOpen] = useState(false);

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  const userPosts = posts.filter((p) => p.authorId === profile.uid);
  const userShots = shots.filter((s) => s.authorId === profile.uid);

  const openEditModal = () => {
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setBio(profile.bio);
    setAvatarUrl(profile.avatarUrl);
    setAvatarBlob(null);
    setEditOpen(true);
  };

  const handleAvatarChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 512, 0.85);
      setAvatarBlob(compressed.blob);
      setAvatarUrl(compressed.previewUrl);
    } catch {
      onToast('Could not read image.', 'error');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const cleanUser = sanitizeUsername(username);
    if (cleanUser.length < 2 || !displayName.trim()) {
      onToast('Valid username and display name are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      let finalAvatar = avatarUrl;
      if (!isDemoMode && avatarBlob) {
        finalAvatar = await uploadMediaWithProgress(
          `avatars/${profile.uid}/avatar_${Date.now()}.jpg`,
          avatarBlob,
          () => {},
          avatarUrl
        );
      }
      await onSaveProfile({
        ...profile,
        displayName: displayName.trim(),
        username: cleanUser,
        bio: bio.trim(),
        avatarUrl: finalAvatar,
        updatedAt: new Date().toISOString(),
      });
      setEditOpen(false);
      onToast('Profile updated!', 'success');
    } catch {
      onToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 lg:pt-8 space-y-8">
      {!isOwnProfile && (
        <button
          type="button"
          onClick={onBackToOwnProfile}
          className="text-xs font-semibold text-pink-500 hover:underline"
        >
          Back to your profile
        </button>
      )}

      {/* Profile Header Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            referrerPolicy="no-referrer"
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-pink-500/50 shrink-0"
          />

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold">{profile.displayName}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">@{profile.username}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isOwnProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenByDev}
                      className="lg:hidden h-10 px-3.5 rounded-xl border border-pink-500/35 text-pink-500 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>By DEV</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onToggleFollow(profile.uid)}
                      className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                        isFollowing
                          ? 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white'
                          : 'bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartChat(profile.uid)}
                      className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Message</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="text-sm text-slate-700 dark:text-slate-300 max-w-xl leading-relaxed">
                {profile.bio}
              </p>
            )}

            <div className="flex items-center gap-6 pt-1 text-sm tabular-nums">
              <div>
                <span className="font-bold">{formatCompactNumber(userPosts.length)}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">posts</span>
              </div>
              <div>
                <span className="font-bold">{formatCompactNumber(profile.followersCount)}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">followers</span>
              </div>
              <div>
                <span className="font-bold">{formatCompactNumber(profile.followingCount)}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">following</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Quick Settings Row */}
        {isOwnProfile && (
          <div className="lg:hidden mt-6 pt-5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold flex items-center justify-center gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-violet-600" />
                  <span>Dark theme</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="h-10 px-4 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-semibold flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>{isDemoMode ? 'Sign In' : 'Sign Out'}</span>
            </button>
          </div>
        )}
      </section>

      {/* Tabs: Posts / Shots / Saved */}
      <div className="space-y-5">
        <div
          role="tablist"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/75 dark:bg-white/5 border border-slate-200 dark:border-white/10"
        >
          <button
            role="tab"
            aria-selected={tab === 'posts'}
            type="button"
            onClick={() => setTab('posts')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
              tab === 'posts'
                ? 'bg-white dark:bg-[#191928] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Posts ({userPosts.length})</span>
          </button>

          <button
            role="tab"
            aria-selected={tab === 'shots'}
            type="button"
            onClick={() => setTab('shots')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
              tab === 'shots'
                ? 'bg-white dark:bg-[#191928] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Shots ({userShots.length})</span>
          </button>

          {isOwnProfile && (
            <button
              role="tab"
              aria-selected={tab === 'saved'}
              type="button"
              onClick={() => setTab('saved')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
                tab === 'saved'
                  ? 'bg-white dark:bg-[#191928] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({savedPosts.length})</span>
            </button>
          )}
        </div>

        {tab === 'posts' &&
          (userPosts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-10 text-center text-sm text-slate-500">
              No posts yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {userPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onOpenComments(post)}
                  className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/70 dark:border-white/10"
                >
                  <img
                    src={post.mediaUrl}
                    alt={post.caption.slice(0, 60)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          ))}

        {tab === 'shots' &&
          (userShots.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-10 text-center text-sm text-slate-500">
              No Shots published yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {userShots.map((shot) => (
                <button
                  key={shot.id}
                  type="button"
                  onClick={onOpenShots}
                  className="relative aspect-[9/14] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/70 dark:border-white/10 text-left"
                >
                  {shot.posterUrl ? (
                    <img
                      src={shot.posterUrl}
                      alt={shot.caption.slice(0, 50)}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-900 via-pink-900 to-amber-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3 text-white">
                    <span className="text-xs font-medium line-clamp-2">{shot.caption}</span>
                  </div>
                </button>
              ))}
            </div>
          ))}

        {tab === 'saved' &&
          (savedPosts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-10 text-center text-sm text-slate-500">
              Bookmark posts in your feed to revisit them here.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {savedPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onOpenComments(post)}
                  className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/70 dark:border-white/10"
                >
                  <img
                    src={post.mediaUrl}
                    alt={post.caption.slice(0, 60)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          ))}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Edit profile"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.form
              initial={reducedMotion ? false : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reducedMotion ? undefined : { y: 40, opacity: 0 }}
              onSubmit={handleSave}
              className="relative z-10 w-full sm:max-w-md bg-white dark:bg-[#12121D] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Edit Profile</h2>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  aria-label="Close edit profile"
                  className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover border border-pink-500/40"
                />
                <label className="cursor-pointer h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-semibold inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Change avatar</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-1">
                  Display name
                </label>
                <input
                  type="text"
                  required
                  maxLength={64}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-slate-100 dark:bg-[#0B0B12] border border-slate-200 dark:border-white/10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  value={username}
                  onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl bg-slate-100 dark:bg-[#0B0B12] border border-slate-200 dark:border-white/10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-1">
                  Bio
                </label>
                <textarea
                  rows={3}
                  maxLength={240}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-slate-100 dark:bg-[#0B0B12] border border-slate-200 dark:border-white/10 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save changes</span>
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
