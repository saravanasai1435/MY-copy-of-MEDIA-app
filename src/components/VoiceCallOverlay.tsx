import type { RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import type { ActiveCallPhase } from '../hooks/useVoiceCall';
import { formatDuration } from '../lib/formatters';
import type { CallStatus, UserProfile } from '../types/pulsr';

interface VoiceCallOverlayProps {
  phase: ActiveCallPhase;
  peer: UserProfile | undefined;
  durationSec: number;
  audioLevel: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  endReason: CallStatus | null;
  remoteAudioRef: RefObject<HTMLAudioElement | null>;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

export function VoiceCallOverlay({
  phase,
  peer,
  durationSec,
  audioLevel,
  isMuted,
  isSpeakerOn,
  endReason,
  remoteAudioRef,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
}: VoiceCallOverlayProps) {
  const reducedMotion = useReducedMotion();

  const statusText =
    phase === 'incoming'
      ? 'Incoming voice call...'
      : phase === 'outgoing'
      ? 'Ringing...'
      : phase === 'connected'
      ? formatDuration(durationSec)
      : endReason === 'declined'
      ? 'Call declined'
      : endReason === 'busy'
      ? 'User is busy'
      : endReason === 'missed'
      ? 'No answer'
      : 'Call ended';

  const ringScale = 1 + audioLevel * 0.35;

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Voice call"
            className="fixed inset-0 z-50 bg-[#08080E]/95 backdrop-blur-2xl text-white flex flex-col items-center justify-between py-14 px-6"
          >
            <div className="text-center space-y-1">
              <span className="text-xs font-medium text-pink-400">PULSR Voice</span>
              <h2 className="font-display text-2xl font-bold">
                {peer?.displayName || 'PULSR Creator'}
              </h2>
              <p className="text-sm text-slate-300 tabular-nums">{statusText}</p>
            </div>

            {/* Pulsing Avatar & Audio-Level Ring */}
            <div className="relative flex items-center justify-center my-8">
              {(phase === 'incoming' || phase === 'outgoing') && !reducedMotion && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute w-36 h-36 rounded-full border-2 border-pink-500/60"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.85], opacity: [0.4, 0] }}
                    transition={{ duration: 1.8, delay: 0.5, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute w-36 h-36 rounded-full border border-violet-500/50"
                  />
                </>
              )}

              {phase === 'connected' && (
                <div
                  style={{
                    transform: `scale(${reducedMotion ? 1 : ringScale})`,
                    transition: 'transform 80ms linear',
                  }}
                  className="absolute w-40 h-40 rounded-full bg-gradient-to-tr from-violet-500/35 via-pink-500/35 to-amber-500/35 blur-md"
                />
              )}

              <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-white/25 shadow-2xl">
                {peer?.avatarUrl ? (
                  <img
                    src={peer.avatarUrl}
                    alt={peer.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-3xl font-bold">
                    {(peer?.displayName || 'P')[0]}
                  </div>
                )}
              </div>
            </div>

            {/* Call Controls */}
            {phase === 'incoming' ? (
              <div className="flex items-center gap-8">
                <button
                  type="button"
                  onClick={onDecline}
                  aria-label="Decline voice call"
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-colors"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  aria-label="Accept voice call"
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg transition-colors"
                >
                  <Phone className="w-7 h-7" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={`w-14 h-14 rounded-full flex items-center justify-center border transition-colors ${
                    isMuted
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                <button
                  type="button"
                  onClick={onEnd}
                  aria-label="End voice call"
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-colors"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>

                <button
                  type="button"
                  onClick={onToggleSpeaker}
                  aria-label={isSpeakerOn ? 'Mute speaker' : 'Enable speaker'}
                  className={`w-14 h-14 rounded-full flex items-center justify-center border transition-colors ${
                    !isSpeakerOn
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                  }`}
                >
                  {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
