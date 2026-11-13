import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Film, ImagePlus, Loader2, Radio, Upload, X } from 'lucide-react';
import { extractHashtags } from '../lib/formatters';
import { compressImageFile } from '../lib/imageCompression';
import { makeId, uploadMediaWithProgress } from '../services/dataService';
import type { Channel, Post, Shot, UserProfile } from '../types/pulsr';

export type CreateMode = 'post' | 'shot' | 'channel-post';

interface CreateSheetProps {
  open: boolean;
  initialMode?: CreateMode;
  onClose: () => void;
  currentUser: UserProfile;
  channels: Channel[];
  isDemoMode: boolean;
  onPublishPost: (post: Post) => Promise<void>;
  onPublishShot: (shot: Shot) => Promise<void>;
  onToast: (msg: string, tone?: 'info' | 'success' | 'error') => void;
}

export function CreateSheet({
  open,
  initialMode = 'post',
  onClose,
  currentUser,
  channels,
  isDemoMode,
  onPublishPost,
  onPublishShot,
  onToast,
}: CreateSheetProps) {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<CreateMode>(initialMode);
  const [caption, setCaption] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>(channels[0]?.id || '');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [progress, setProgress] = useState(0);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setProgress(0);
      if (!selectedChannelId && channels[0]?.id) {
        setSelectedChannelId(channels[0].id);
      }
    }
  }, [open, initialMode, channels, selectedChannelId]);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (mode === 'shot' && !isVideo) {
      onToast('Shots require a vertical video file (MP4 or WebM).', 'error');
      return;
    }

    setMediaFile(file);
    if (isVideo) {
      setMediaType('video');
      setCompressedBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setMediaType('image');
      try {
        const compressed = await compressImageFile(file, 1440, 0.84);
        setCompressedBlob(compressed.blob);
        setPreviewUrl(compressed.previewUrl);
      } catch {
        onToast('Unable to compress selected image.', 'error');
      }
    }
  };

  const resetForm = () => {
    setCaption('');
    setMediaFile(null);
    setCompressedBlob(null);
    setPreviewUrl('');
    setProgress(0);
  };

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      onToast('Add a caption or hashtags before publishing.', 'error');
      return;
    }
    if (!compressedBlob && !previewUrl) {
      onToast('Select a photo or video to publish.', 'error');
      return;
    }

    setPublishing(true);
    const nowIso = new Date().toISOString();
    const hashtags = extractHashtags(caption);

    try {
      if (mode === 'shot') {
        const shotId = makeId('shot');
        let finalVideoUrl = previewUrl;
        if (!isDemoMode && compressedBlob) {
          finalVideoUrl = await uploadMediaWithProgress(
            `shots/${currentUser.uid}/${shotId}.mp4`,
            compressedBlob,
            setProgress,
            previewUrl
          );
        } else {
          setProgress(100);
        }

        const newShot: Shot = {
          id: shotId,
          authorId: currentUser.uid,
          channelId: null,
          caption: caption.trim(),
          videoUrl: finalVideoUrl,
          hashtags,
          likesCount: 0,
          commentsCount: 0,
          viewsCount: 1,
          durationSec: 15,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await onPublishShot(newShot);
        onToast('Shot published!', 'success');
      } else {
        const postId = makeId('post');
        let finalMediaUrl = previewUrl;
        if (!isDemoMode && compressedBlob) {
          finalMediaUrl = await uploadMediaWithProgress(
            `posts/${currentUser.uid}/${postId}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
            compressedBlob,
            setProgress,
            previewUrl
          );
        } else {
          setProgress(100);
        }

        const newPost: Post = {
          id: postId,
          authorId: currentUser.uid,
          channelId: mode === 'channel-post' ? selectedChannelId || null : null,
          caption: caption.trim(),
          mediaUrl: finalMediaUrl,
          mediaType,
          hashtags,
          likesCount: 0,
          commentsCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await onPublishPost(newPost);
        onToast(mode === 'channel-post' ? 'Channel post published!' : 'Post published!', 'success');
      }

      resetForm();
      onClose();
    } catch {
      onToast('Publish failed. Please try again.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Create content"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            initial={reducedMotion ? false : { y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? undefined : { y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#12121D] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold">Create</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close create sheet"
                className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 mb-5">
              {(
                [
                  { id: 'post', label: 'Post', icon: ImagePlus },
                  { id: 'shot', label: 'Shot', icon: Film },
                  { id: 'channel-post', label: 'Channel', icon: Radio },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setMode(tab.id);
                      setMediaFile(null);
                      setPreviewUrl('');
                      setCompressedBlob(null);
                    }}
                    className={`h-10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      active
                        ? 'bg-white dark:bg-[#1B1B2B] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              {mode === 'channel-post' && (
                <div>
                  <label
                    htmlFor="create-channel-select"
                    className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-1.5"
                  >
                    Select Channel
                  </label>
                  <select
                    id="create-channel-select"
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-[#0B0B12] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (@{c.handle})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Media Upload Area */}
              <label className="block cursor-pointer">
                <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0B0B12] p-4 text-center hover:border-pink-500/60 transition-colors">
                  {previewUrl ? (
                    mediaType === 'video' || mode === 'shot' ? (
                      <video
                        src={previewUrl}
                        controls
                        className="w-full max-h-64 rounded-xl object-cover mx-auto"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Upload preview"
                        className="w-full max-h-64 rounded-xl object-cover mx-auto"
                      />
                    )
                  ) : (
                    <div className="py-8 flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-pink-500" />
                      <span className="text-sm font-medium">
                        {mode === 'shot'
                          ? 'Choose a vertical video (MP4 / WebM)'
                          : 'Choose a photo or video'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Images are compressed client-side for fast upload
                      </span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept={mode === 'shot' ? 'video/*' : 'image/*,video/*'}
                  className="sr-only"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </label>

              {mediaFile && (
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Selected: {mediaFile.name}
                </div>
              )}

              <div>
                <label
                  htmlFor="create-caption"
                  className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-1.5"
                >
                  Caption & hashtags
                </label>
                <textarea
                  id="create-caption"
                  rows={3}
                  maxLength={1000}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption... #pulsr #music #frames"
                  className="w-full p-3.5 rounded-xl bg-slate-100 dark:bg-[#0B0B12] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                />
              </div>

              {publishing && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Uploading media...</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={publishing}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{publishing ? 'Publishing...' : 'Publish'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
