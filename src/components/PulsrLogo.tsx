import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface PulsrLogoProps {
  variant?: 'full' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function PulsrLogo({
  variant = 'full',
  size = 'md',
  showTagline = false,
  className = '',
}: PulsrLogoProps) {
  const uid = useId().replace(/:/g, '');
  const reducedMotion = useReducedMotion();

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  const gradId = `pulsr-grad-${uid}`;
  const glowId = `pulsr-glow-${uid}`;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <motion.div
        initial={reducedMotion ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`relative shrink-0 ${iconSizes[size]}`}
      >
        {/* Subtle ambient neon glow that blooms after the pulse draws */}
        <motion.div
          aria-hidden="true"
          initial={reducedMotion ? { opacity: 0.45 } : { opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: reducedMotion ? 0 : 0.85, duration: 0.7 }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/40 via-pink-500/35 to-amber-500/40 blur-md"
        />

        <svg
          viewBox="0 0 64 64"
          className="relative w-full h-full overflow-visible"
          role="img"
          aria-label="PULSR logo"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="52%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Rounded squircle emblem container */}
          <rect
            x="2"
            y="2"
            width="60"
            height="60"
            rx="18"
            className="fill-slate-950 dark:fill-[#0E0E17] stroke-slate-800/80"
            strokeWidth="1.5"
          />

          {/* Bold rounded P silhouette */}
          <path
            d="M21 49V16.5H34.5C42.8 16.5 48.5 21.6 48.5 29.2C48.5 36.8 42.8 41.8 34.5 41.8H26.5"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="6.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
          />

          {/* Heartbeat / pulse wave line inside the P bowl */}
          <motion.path
            d="M24 29.2H28.8L31.4 23.2L35.2 35.4L38 29.2H43.2"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reducedMotion ? false : { pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.15 },
              opacity: { duration: 0.25, delay: 0.1 },
            }}
          />
        </svg>
      </motion.div>

      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-display font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 bg-clip-text text-transparent ${textSizes[size]}`}
          >
            PULSR
          </span>
          {showTagline && (
            <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Feel the feed.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
