import { useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Code2, Loader2, Mail, Upload, User } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { sanitizeUsername } from '../lib/formatters';
import { compressImageFile } from '../lib/imageCompression';
import { makeId, uploadMediaWithProgress } from '../services/dataService';
import type { UserProfile } from '../types/pulsr';
import { PulsrLogo } from './PulsrLogo';
import { PulseWave3D } from './PulseWave3D';

interface AuthScreenProps {
  needsOnboarding: boolean;
  initialProfile: Partial<UserProfile> | null;
  onCompleteOnboarding: (profile: UserProfile) => Promise<void>;
  onEnterDemo: () => void;
  onOpenByDev: () => void;
}

export function AuthScreen({
  needsOnboarding,
  initialProfile,
  onCompleteOnboarding,
  onEnterDemo,
  onOpenByDev,
}: AuthScreenProps) {
  const reducedMotion = useReducedMotion();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Onboarding multi-step state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState(
    sanitizeUsername(initialProfile?.username || initialProfile?.displayName || '')
  );
  const [displayName, setDisplayName] = useState(initialProfile?.displayName || '');
  const [bio, setBio] = useState(initialProfile?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(initialProfile?.avatarUrl || '');
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [uploadPct, setUploadPct] = useState<number>(0);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setErrorMsg(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || password.length < 6) {
      setErrorMsg('Enter a valid email and a password with at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setErrorMsg(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 512, 0.85);
      setAvatarBlob(compressed.blob);
      setAvatarPreview(compressed.previewUrl);
    } catch {
      setErrorMsg('Could not process that image file. Try another PNG or JPG.');
    }
  };

  const handleFinishOnboarding = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanUser = sanitizeUsername(username);
    if (cleanUser.length < 2) {
      setErrorMsg('Username must be at least 2 characters.');
      setStep(1);
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const uid = auth.currentUser?.uid || makeId('user');
      let finalAvatar = avatarPreview;
      if (avatarBlob) {
        finalAvatar = await uploadMediaWithProgress(
          `avatars/${uid}/avatar_${Date.now()}.jpg`,
          avatarBlob,
          setUploadPct,
          avatarPreview
        );
      } else if (!finalAvatar) {
        const initials = displayName
          .trim()
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#EC4899"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g)"/><text x="60" y="68" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-size="40" font-weight="700">${initials || 'PL'}</text></svg>`;
        finalAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      }

      const nowIso = new Date().toISOString();
      await onCompleteOnboarding({
        uid,
        username: cleanUser,
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: finalAvatar,
        followersCount: initialProfile?.followersCount ?? 0,
        followingCount: initialProfile?.followingCount ?? 0,
        postsCount: initialProfile?.postsCount ?? 0,
        isOnline: true,
        onboarded: true,
        lastSeen: nowIso,
        createdAt: initialProfile?.createdAt || nowIso,
        updatedAt: nowIso,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#09090F] text-slate-100 flex flex-col lg:flex-row">
      {/* Interactive 3D Pulse Stage (left desktop hero / full background on mobile) */}
      <div className="relative lg:w-1/2 min-h-[300px] lg:min-h-screen flex flex-col justify-between p-6 lg:p-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <PulseWave3D intensity={1.05} />
        </div>

        {/* Soft ambient gradient orbs (no backdrop-filter over WebGL) */}
        <motion.div
          aria-hidden="true"
          animate={
            reducedMotion
              ? undefined
              : { y: [0, -14, 0], opacity: [0.22, 0.35, 0.22] }
          }
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-violet-600/30 blur-3xl z-0"
        />
        <motion.div
          aria-hidden="true"
          animate={
            reducedMotion
              ? undefined
              : { y: [0, 16, 0], opacity: [0.18, 0.32, 0.18] }
          }
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute bottom-10 right-6 w-64 h-64 rounded-full bg-amber-500/20 blur-3xl z-0"
        />

        <div className="relative z-10 flex items-center justify-between">
          <PulsrLogo size="lg" showTagline />
        </div>

        <div className="relative z-10 mt-10 lg:mt-0 max-w-md bg-[#0C0C14]/85 border border-white/10 rounded-2xl p-6">
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
            Short vertical Shots, live Channels, and instant voice calls.
          </h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Follow creators, subscribe to dedicated media channels, message in real time, and call
            friends directly in your browser.
          </p>
        </div>
      </div>

      {/* Right Authentication / Onboarding Panel */}
      <div className="relative z-10 lg:w-1/2 flex flex-col items-center justify-center px-6 py-10 lg:p-14 bg-[#0D0D15] border-t lg:border-t-0 lg:border-l border-white/10">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {needsOnboarding ? (
              <motion.form
                key="onboarding"
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
                onSubmit={handleFinishOnboarding}
                className="bg-[#13131F] border border-white/10 rounded-2xl p-6 lg:p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">
                      Set up your profile
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Step {step} of 3 — Personalize your PULSR identity
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
                    {[1, 2, 3].map((idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${
                          idx <= step
                            ? 'w-6 bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500'
                            : 'w-2 bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-3 text-xs text-rose-200"
                  >
                    {errorMsg}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step-1"
                      initial={reducedMotion ? false : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, x: -16 }}
                      className="space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="onboard-username"
                          className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                          Username
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                            @
                          </span>
                          <input
                            id="onboard-username"
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                            placeholder="saravanasai"
                            className="w-full h-11 pl-8 pr-4 rounded-xl bg-[#0B0B12] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="onboard-display-name"
                          className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                          Display name
                        </label>
                        <input
                          id="onboard-display-name"
                          type="text"
                          required
                          maxLength={64}
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Alex Mercer"
                          className="w-full h-11 px-4 rounded-xl bg-[#0B0B12] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (sanitizeUsername(username).length < 2 || !displayName.trim()) {
                            setErrorMsg('Please enter a valid username and display name.');
                            return;
                          }
                          setErrorMsg(null);
                          setStep(2);
                        }}
                        className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step-2"
                      initial={reducedMotion ? false : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, x: -16 }}
                      className="space-y-5"
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-pink-500/60 bg-[#0B0B12] flex items-center justify-center mb-4">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Avatar preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-10 h-10 text-slate-500" />
                          )}
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>Upload avatar photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                          />
                        </label>
                        <p className="mt-2 text-xs text-slate-400">
                          Automatically compressed before upload. Optional — you can skip.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-slate-300"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step-3"
                      initial={reducedMotion ? false : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, x: -16 }}
                      className="space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="onboard-bio"
                          className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                          Short bio
                        </label>
                        <textarea
                          id="onboard-bio"
                          rows={3}
                          maxLength={240}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell creators what you shoot, build, or listen to..."
                          className="w-full p-3.5 rounded-xl bg-[#0B0B12] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70 resize-none"
                        />
                        <div className="mt-1 text-right text-xs text-slate-500 tabular-nums">
                          {bio.length}/240
                        </div>
                      </div>

                      {loading && uploadPct > 0 && uploadPct < 100 && (
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-amber-500 transition-all"
                            style={{ width: `${uploadPct}%` }}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          disabled={loading}
                          className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-slate-300"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>Enter PULSR</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.form>
            ) : (
              <motion.div
                key="auth-card"
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
                className="bg-[#13131F] border border-white/10 rounded-2xl p-6 lg:p-8 shadow-2xl"
              >
                <div className="mb-6">
                  <h2 className="font-display text-2xl font-bold text-white">
                    {authMode === 'signin' ? 'Welcome back' : 'Create your PULSR account'}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {authMode === 'signin'
                      ? 'Sign in with Google or Email & Password to feel the feed.'
                      : 'Join creators sharing Shots, Channels, and live voice calls.'}
                  </p>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-3 text-xs text-rose-200"
                  >
                    {errorMsg}
                  </div>
                )}

                {/* Method 1: Continue with Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-white text-slate-900 font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-slate-100 transition-colors disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
                  <div className="h-px flex-1 bg-white/10" />
                  <span>or email & password</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Method 2: Email + Password */}
                <form onSubmit={handleEmailAuth} className="space-y-3.5">
                  <div>
                    <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Email address
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-11 px-4 rounded-xl bg-[#0B0B12] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Password
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full h-11 px-4 rounded-xl bg-[#0B0B12] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    <span>{authMode === 'signin' ? 'Sign in with Email' : 'Sign up with Email'}</span>
                  </button>
                </form>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                      setErrorMsg(null);
                    }}
                    className="hover:text-white underline-offset-4 hover:underline py-1"
                  >
                    {authMode === 'signin'
                      ? 'Need an account? Sign up'
                      : 'Already have an account? Sign in'}
                  </button>

                  <button
                    type="button"
                    onClick={onEnterDemo}
                    className="text-pink-400 hover:text-pink-300 font-medium py-1"
                  >
                    Preview Demo Feed
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact By DEV link on the login screen */}
          <div className="mt-6 flex items-center justify-between text-xs text-slate-400 px-1">
            <span>PULSR Social Platform</span>
            <button
              type="button"
              onClick={onOpenByDev}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-pink-400" />
              <span>By DEV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
