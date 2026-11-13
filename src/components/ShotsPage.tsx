import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Heart,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Share2,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatCompactNumber } from '../lib/formatters';
import type { Shot, UserProfile } from '../types/pulsr';

interface ShotsPageProps {
  shots: Shot[];
  usersMap: Map<string, UserProfile>;
  currentUser: UserProfile;
  likedShotIds: Set<string>;
  followingIds: Set<string>;
  onToggleLike: (shot: Shot) => void;
  onToggleFollow: (userId: string) => void;
  onOpenComments: (shot: Shot) => void;
  onOpenProfile: (userId: string) => void;
  onShareShot: (shot: Shot) => void;
  onOpenUploadShot: () => void;
}

function ProceduralShotCanvas({
  sceneType,
  isPlaying,
  posterUrl,
}: {
  sceneType: 'waveform' | 'aurora' | 'prism';
  isPlaying: boolean;
  posterUrl?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, h);
      if (sceneType === 'waveform') {
        grad.addColorStop(0, '#130D28');
        grad.addColorStop(0.5, '#2A1038');
        grad.addColorStop(1, '#1A0F14');
      } else if (sceneType === 'aurora') {
        grad.addColorStop(0, '#071324');
        grad.addColorStop(0.5, '#1D123A');
        grad.addColorStop(1, '#2D1426');
      } else {
        grad.addColorStop(0, '#181024');
        grad.addColorStop(0.5, '#231628');
        grad.addColorStop(1, '#2F1D10');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (sceneType === 'waveform') {
        const bars = 28;
        const barW = (w * 0.72) / bars;
        const startX = w * 0.14;
        for (let i = 0; i < bars; i += 1) {
          const amp = 32 + 120 * Math.abs(Math.sin(phase * 1.8 + i * 0.35));
          const x = startX + i * barW;
          const y = h * 0.52 - amp / 2;
          const barGrad = ctx.createLinearGradient(x, y, x, y + amp);
          barGrad.addColorStop(0, '#8B5CF6');
          barGrad.addColorStop(0.5, '#EC4899');
          barGrad.addColorStop(1, '#F59E0B');
          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x + 2, y, barW - 4, amp, 4);
          ctx.fill();
        }
      } else if (sceneType === 'aurora') {
        for (let ring = 0; ring < 5; ring += 1) {
          ctx.beginPath();
          ctx.strokeStyle =
            ring % 2 === 0 ? 'rgba(236,72,153,0.42)' : 'rgba(139,92,246,0.42)';
          ctx.lineWidth = 3;
          for (let x = 0; x <= w; x += 12) {
            const y =
              h * 0.45 +
              Math.sin(x * 0.015 + phase + ring * 0.7) * (36 + ring * 12) +
              ring * 18;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else {
        const cx = w / 2;
        const cy = h * 0.46;
        for (let i = 0; i < 6; i += 1) {
          const r = 45 + i * 24 + Math.sin(phase + i) * 8;
          ctx.beginPath();
          ctx.strokeStyle =
            i % 2 === 0 ? 'rgba(245,158,11,0.45)' : 'rgba(236,72,153,0.4)';
          ctx.lineWidth = 2.5;
          ctx.arc(cx, cy, r, phase * 0.4 + i, phase * 0.4 + i + Math.PI * 1.45);
          ctx.stroke();
        }
      }

      if (isPlaying && !reducedMotion) {
        phase += 0.04;
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, reducedMotion, sceneType]);

  return (
    <div className="relative w-full h-full">
      {posterUrl && (
        <img
          src={posterUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      )}
      <canvas
        ref={canvasRef}
        width={420}
        height={740}
        className="relative w-full h-full object-cover mix-blend-screen"
      />
    </div>
  );
}

function ShotCard({
  shot,
  author,
  isActive,
  isMuted,
  isLiked,
  isFollowing,
  isOwnShot,
  onToggleMute,
  onToggleLike,
  onToggleFollow,
  onOpenComments,
  onOpenProfile,
  onShareShot,
}: {
  shot: Shot;
  author: UserProfile;
  isActive: boolean;
  isMuted: boolean;
  isLiked: boolean;
  isFollowing: boolean;
  isOwnShot: boolean;
  onToggleMute: () => void;
  onToggleLike: () => void;
  onToggleFollow: () => void;
  onOpenComments: () => void;
  onOpenProfile: () => void;
  onShareShot: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [indicator, setIndicator] = useState<'play' | 'pause' | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive && !paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive, paused]);

  const handleTapVideo = () => {
    setPaused((prev) => {
      const next = !prev;
      setIndicator(next ? 'pause' : 'play');
      window.setTimeout(() => setIndicator(null), 650);
      return next;
    });
  };

  return (
    <section
      data-shot-id={shot.id}
      className="relative snap-start shrink-0 w-full h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] max-w-[440px] mx-auto lg:my-4 lg:rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center"
    >
      {/* Video or Procedural Canvas Stream */}
      <button
        type="button"
        onClick={handleTapVideo}
        aria-label={paused ? 'Play shot' : 'Pause shot'}
        className="absolute inset-0 w-full h-full focus:outline-none"
      >
        {shot.videoUrl ? (
          <video
            ref={videoRef}
            src={shot.videoUrl}
            poster={shot.posterUrl}
            loop
            playsInline
            muted={isMuted}
            className="w-full h-full object-cover"
          />
        ) : (
          <ProceduralShotCanvas
            sceneType={shot.demoScene || 'waveform'}
            isPlaying={isActive && !paused}
            posterUrl={shot.posterUrl}
          />
        )}
      </button>

      {/* Scrim for guaranteed caption contrast */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* Tap Play/Pause Indicator */}
      <AnimatePresence>
        {indicator && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-black/55 border border-white/20 flex items-center justify-center text-white">
              {indicator === 'pause' ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-0.5" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute / Unmute Button */}
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute shot' : 'Mute shot'}
        className="absolute top-4 left-4 min-h-[44px] min-w-[44px] rounded-full bg-black/45 border border-white/15 text-white flex items-center justify-center"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Right Rail Engagement Controls */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-10">
        <button
          type="button"
          onClick={onToggleLike}
          aria-label={isLiked ? 'Unlike shot' : 'Like shot'}
          className="flex flex-col items-center gap-1 text-white"
        >
          <span className="w-12 h-12 rounded-full bg-black/45 border border-white/15 flex items-center justify-center">
            <Heart
              className={`w-6 h-6 transition-colors ${
                isLiked ? 'text-pink-500 fill-pink-500' : 'text-white'
              }`}
            />
          </span>
          <span className="text-xs font-semibold tabular-nums">
            {formatCompactNumber(shot.likesCount)}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenComments}
          aria-label="Open shot comments"
          className="flex flex-col items-center gap-1 text-white"
        >
          <span className="w-12 h-12 rounded-full bg-black/45 border border-white/15 flex items-center justify-center">
            <MessageCircle className="w-6 h-6" />
          </span>
          <span className="text-xs font-semibold tabular-nums">
            {formatCompactNumber(shot.commentsCount)}
          </span>
        </button>

        <button
          type="button"
          onClick={onShareShot}
          aria-label="Share shot"
          className="flex flex-col items-center gap-1 text-white"
        >
          <span className="w-12 h-12 rounded-full bg-black/45 border border-white/15 flex items-center justify-center">
            <Share2 className="w-6 h-6" />
          </span>
          <span className="text-xs font-semibold">Share</span>
        </button>
      </div>

      {/* Bottom Metadata & Follow */}
      <div className="absolute inset-x-0 bottom-0 p-4 pr-18 text-white z-10 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 min-w-0 text-left"
          >
            <img
              src={author.avatarUrl}
              alt={author.displayName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-white/30 shrink-0"
            />
            <span className="font-semibold text-sm truncate">@{author.username}</span>
          </button>

          {!isOwnShot && (
            <button
              type="button"
              onClick={onToggleFollow}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                isFollowing
                  ? 'bg-white/20 text-white'
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
          )}
        </div>

        <p className="text-sm text-white/95 line-clamp-2 leading-snug">{shot.caption}</p>
      </div>
    </section>
  );
}

export function ShotsPage({
  shots,
  usersMap,
  currentUser,
  likedShotIds,
  followingIds,
  onToggleLike,
  onToggleFollow,
  onOpenComments,
  onOpenProfile,
  onShareShot,
  onOpenUploadShot,
}: ShotsPageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(shots[0]?.id ?? null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sections = container.querySelectorAll<HTMLElement>('[data-shot-id]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = entry.target.getAttribute('data-shot-id');
            if (id) setActiveId(id);
          }
        }
      },
      { root: container, threshold: 0.65 }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, [shots.length]);

  if (shots.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
        <h2 className="font-display text-xl font-bold">No Shots yet</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Upload a short vertical video to start the Shots stream.
        </p>
        <button
          type="button"
          onClick={onOpenUploadShot}
          className="mt-5 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white text-sm font-semibold"
        >
          Upload Shot
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] lg:h-screen bg-[#07070C]">
      {/* Upload Shot CTA */}
      <button
        type="button"
        onClick={onOpenUploadShot}
        className="fixed lg:absolute top-4 right-4 z-20 h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg"
      >
        <Plus className="w-4 h-4" />
        <span>Upload Shot</span>
      </button>

      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {shots.map((shot) => {
          const author = usersMap.get(shot.authorId) || currentUser;
          return (
            <ShotCard
              key={shot.id}
              shot={shot}
              author={author}
              isActive={activeId === shot.id}
              isMuted={isMuted}
              isLiked={likedShotIds.has(shot.id)}
              isFollowing={followingIds.has(shot.authorId)}
              isOwnShot={shot.authorId === currentUser.uid}
              onToggleMute={() => setIsMuted((m) => !m)}
              onToggleLike={() => onToggleLike(shot)}
              onToggleFollow={() => onToggleFollow(shot.authorId)}
              onOpenComments={() => onOpenComments(shot)}
              onOpenProfile={() => onOpenProfile(shot.authorId)}
              onShareShot={() => onShareShot(shot)}
            />
          );
        })}
      </div>
    </div>
  );
}
