import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { CALL_RING_TIMEOUT_MS, getIceServers } from '../constants/webrtc';
import { db } from '../lib/firebase';
import { buildConversationId } from '../lib/formatters';
import { ensureConversation, makeId, pushNotification, sendChatMessage } from '../services/dataService';
import type { CallStatus, VoiceCallSession } from '../types/pulsr';

export type ActiveCallPhase = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended';

interface UseVoiceCallArgs {
  currentUserId: string | null;
  currentUserName: string;
  isDemoMode: boolean;
  onLogDemoCallMessage?: (
    conversationId: string,
    peerId: string,
    status: 'missed' | 'declined' | 'ended' | 'busy',
    durationSec: number
  ) => void;
  onToast: (msg: string, tone?: 'info' | 'success' | 'error') => void;
}

export function useVoiceCall({
  currentUserId,
  currentUserName,
  isDemoMode,
  onLogDemoCallMessage,
  onToast,
}: UseVoiceCallArgs) {
  const [phase, setPhase] = useState<ActiveCallPhase>('idle');
  const [callSession, setCallSession] = useState<VoiceCallSession | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [durationSec, setDurationSec] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [endReason, setEndReason] = useState<CallStatus | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeCallUnsubsRef = useRef<Unsubscribe[]>([]);
  const ringTimeoutRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const demoConnectedTimeoutRef = useRef<number | null>(null);
  const phaseRef = useRef<ActiveCallPhase>('idle');
  phaseRef.current = phase;

  const cleanupMediaAndPeer = useCallback(() => {
    if (ringTimeoutRef.current) {
      window.clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (durationTimerRef.current) {
      window.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (demoConnectedTimeoutRef.current) {
      window.clearTimeout(demoConnectedTimeoutRef.current);
      demoConnectedTimeoutRef.current = null;
    }
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    activeCallUnsubsRef.current.forEach((u) => u());
    activeCallUnsubsRef.current = [];

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setAudioLevel(0);
  }, []);

  const startAudioLevelMeter = useCallback((stream?: MediaStream | null) => {
    if (!stream) {
      // Gentle synthetic pulse in demo preview when mic isn't attached
      const start = performance.now();
      const step = () => {
        const t = (performance.now() - start) / 1000;
        setAudioLevel(0.2 + 0.35 * Math.abs(Math.sin(t * 4.2)));
        levelRafRef.current = requestAnimationFrame(step);
      };
      levelRafRef.current = requestAnimationFrame(step);
      return;
    }
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) sum += buffer[i];
        const avg = sum / buffer.length / 255;
        setAudioLevel(Math.min(1, avg * 2.4));
        levelRafRef.current = requestAnimationFrame(tick);
      };
      levelRafRef.current = requestAnimationFrame(tick);
    } catch {
      // Ignore AudioContext restriction
    }
  }, []);

  const startDurationCounter = useCallback(() => {
    setDurationSec(0);
    if (durationTimerRef.current) window.clearInterval(durationTimerRef.current);
    durationTimerRef.current = window.setInterval(() => {
      setDurationSec((s) => s + 1);
    }, 1000);
  }, []);

  const finishCall = useCallback(
    async (
      finalStatus: 'missed' | 'declined' | 'ended' | 'busy',
      sessionOverride?: VoiceCallSession | null
    ) => {
      const session = sessionOverride ?? callSession;
      const elapsed = durationSec;
      cleanupMediaAndPeer();
      setEndReason(finalStatus);
      setPhase('ended');

      if (session) {
        if (isDemoMode) {
          onLogDemoCallMessage?.(session.conversationId, peerId || session.calleeId, finalStatus, elapsed);
        } else {
          try {
            await updateDoc(doc(db, 'calls', session.id), {
              status: finalStatus,
              durationSec: elapsed,
              updatedAt: new Date().toISOString(),
            });
            const conv = await ensureConversation(session.callerId, session.calleeId);
            await sendChatMessage(conv, {
              id: makeId('msg'),
              senderId: currentUserId || session.callerId,
              type: 'call',
              callStatus: finalStatus,
              callDurationSec: elapsed,
              readBy: [currentUserId || session.callerId],
              createdAt: new Date().toISOString(),
            });
            if (finalStatus === 'missed' && currentUserId === session.callerId) {
              await pushNotification({
                id: makeId('notif'),
                recipientId: session.calleeId,
                actorId: session.callerId,
                type: 'missed_call',
                targetId: session.id,
                text: `Missed voice call from ${currentUserName}.`,
                read: false,
                createdAt: new Date().toISOString(),
              });
            }
          } catch {
            // Best-effort cleanup
          }
        }
      }

      window.setTimeout(() => {
        setPhase('idle');
        setCallSession(null);
        setPeerId(null);
        setEndReason(null);
        setDurationSec(0);
        setIsMuted(false);
      }, 1100);
    },
    [
      callSession,
      cleanupMediaAndPeer,
      currentUserId,
      currentUserName,
      durationSec,
      isDemoMode,
      onLogDemoCallMessage,
      peerId,
    ]
  );

  // Listen for incoming calls in real Firestore mode
  useEffect(() => {
    if (!currentUserId || isDemoMode) return;
    const q = query(collection(db, 'calls'), where('calleeId', '==', currentUserId));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        for (const d of snap.docs) {
          const incoming = d.data() as VoiceCallSession;
          if (incoming.status !== 'ringing') continue;
          if (phaseRef.current !== 'idle') {
            await updateDoc(doc(db, 'calls', incoming.id), {
              status: 'busy',
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
            continue;
          }
          setCallSession(incoming);
          setPeerId(incoming.callerId);
          setPhase('incoming');
          break;
        }
      },
      () => {
        // Non-fatal call listener error
      }
    );
    return () => unsub();
  }, [currentUserId, isDemoMode]);

  const startOutgoingCall = useCallback(
    async (targetUserId: string) => {
      if (!currentUserId) return;
      if (phaseRef.current !== 'idle') {
        onToast('Already in a call', 'info');
        return;
      }

      const conversationId = buildConversationId(currentUserId, targetUserId);
      const callId = makeId('call');
      const nowIso = new Date().toISOString();

      setPeerId(targetUserId);
      setIsMuted(false);
      setIsSpeakerOn(true);
      setPhase('outgoing');

      if (isDemoMode) {
        const demoSession: VoiceCallSession = {
          id: callId,
          callerId: currentUserId,
          calleeId: targetUserId,
          conversationId,
          status: 'ringing',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        setCallSession(demoSession);
        demoConnectedTimeoutRef.current = window.setTimeout(() => {
          setPhase('connected');
          startDurationCounter();
          startAudioLevelMeter(null);
        }, 1800);
        return;
      }

      try {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = stream;
        } catch {
          onToast('Microphone permission unavailable — continuing signaling test', 'info');
        }

        const pc = new RTCPeerConnection({ iceServers: getIceServers() });
        pcRef.current = pc;

        if (stream) {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream!));
        }

        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
        };

        const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(callerCandidatesCol, event.candidate.toJSON()).catch(() => {});
          }
        };

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);

        const session: VoiceCallSession = {
          id: callId,
          callerId: currentUserId,
          calleeId: targetUserId,
          conversationId,
          status: 'ringing',
          offer: { type: offer.type, sdp: offer.sdp || '' },
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        setCallSession(session);
        await setDoc(doc(db, 'calls', callId), session);

        ringTimeoutRef.current = window.setTimeout(() => {
          if (phaseRef.current === 'outgoing') {
            finishCall('missed', session);
          }
        }, CALL_RING_TIMEOUT_MS);

        const callUnsub = onSnapshot(doc(db, 'calls', callId), async (snap) => {
          const data = snap.data() as VoiceCallSession | undefined;
          if (!data) return;
          if (data.answer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(data.answer as RTCSessionDescriptionInit)
            );
            if (ringTimeoutRef.current) window.clearTimeout(ringTimeoutRef.current);
            setPhase('connected');
            startDurationCounter();
            startAudioLevelMeter(stream);
          }
          if (data.status === 'declined' || data.status === 'busy' || data.status === 'ended') {
            finishCall(data.status, data);
          }
        });

        const candUnsub = onSnapshot(
          collection(db, 'calls', callId, 'calleeCandidates'),
          (snap) => {
            snap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
              }
            });
          }
        );

        activeCallUnsubsRef.current.push(callUnsub, candUnsub);
      } catch {
        onToast('Unable to place voice call', 'error');
        finishCall('ended');
      }
    },
    [
      currentUserId,
      finishCall,
      isDemoMode,
      onToast,
      startAudioLevelMeter,
      startDurationCounter,
    ]
  );

  const acceptIncomingCall = useCallback(async () => {
    if (!callSession) return;
    if (isDemoMode) {
      setPhase('connected');
      startDurationCounter();
      startAudioLevelMeter(null);
      return;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      } catch {
        onToast('Microphone permission denied', 'error');
      }

      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream!));
      }

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      const calleeCandidatesCol = collection(db, 'calls', callSession.id, 'calleeCandidates');
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(calleeCandidatesCol, event.candidate.toJSON()).catch(() => {});
        }
      };

      if (callSession.offer) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(callSession.offer as RTCSessionDescriptionInit)
        );
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(doc(db, 'calls', callSession.id), {
        status: 'accepted',
        answer: { type: answer.type, sdp: answer.sdp || '' },
        updatedAt: new Date().toISOString(),
      });

      setPhase('connected');
      startDurationCounter();
      startAudioLevelMeter(stream);

      const candUnsub = onSnapshot(
        collection(db, 'calls', callSession.id, 'callerCandidates'),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
            }
          });
        }
      );

      const callUnsub = onSnapshot(doc(db, 'calls', callSession.id), (snap) => {
        const data = snap.data() as VoiceCallSession | undefined;
        if (data?.status === 'ended' || data?.status === 'missed') {
          finishCall(data.status, data);
        }
      });

      activeCallUnsubsRef.current.push(candUnsub, callUnsub);
    } catch {
      finishCall('ended');
    }
  }, [
    callSession,
    finishCall,
    isDemoMode,
    onToast,
    startAudioLevelMeter,
    startDurationCounter,
  ]);

  const declineIncomingCall = useCallback(() => {
    finishCall('declined');
  }, [finishCall]);

  const endActiveCall = useCallback(() => {
    const status = phaseRef.current === 'outgoing' ? 'missed' : 'ended';
    finishCall(status);
  }, [finishCall]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.volume = next ? 1 : 0.4;
      }
      return next;
    });
  }, []);

  const simulateIncomingCall = useCallback(
    (fromUserId: string) => {
      if (!currentUserId || phaseRef.current !== 'idle') return;
      const nowIso = new Date().toISOString();
      setPeerId(fromUserId);
      setCallSession({
        id: makeId('call'),
        callerId: fromUserId,
        calleeId: currentUserId,
        conversationId: buildConversationId(currentUserId, fromUserId),
        status: 'ringing',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      setPhase('incoming');
    },
    [currentUserId]
  );

  useEffect(() => () => cleanupMediaAndPeer(), [cleanupMediaAndPeer]);

  return {
    phase,
    peerId,
    durationSec,
    audioLevel,
    isMuted,
    isSpeakerOn,
    endReason,
    remoteAudioRef,
    startOutgoingCall,
    acceptIncomingCall,
    declineIncomingCall,
    endActiveCall,
    toggleMute,
    toggleSpeaker,
    simulateIncomingCall,
  };
}
