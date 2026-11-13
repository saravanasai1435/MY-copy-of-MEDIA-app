import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ImagePlus,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Send,
  Smile,
} from 'lucide-react';
import { formatDuration, formatRelativeTime } from '../lib/formatters';
import { compressImageFile } from '../lib/imageCompression';
import { makeId, uploadMediaWithProgress } from '../services/dataService';
import type { ChatMessage, Conversation, UserProfile } from '../types/pulsr';

interface MessagesPageProps {
  currentUser: UserProfile;
  usersMap: Map<string, UserProfile>;
  conversations: Conversation[];
  activeConversationId: string | null;
  messagesMap: Record<string, ChatMessage[]>;
  isDemoMode: boolean;
  onSelectConversation: (convId: string | null) => void;
  onSendMessage: (conversation: Conversation, message: ChatMessage) => Promise<void>;
  onTypingChange: (conversationId: string, typing: boolean) => void;
  onMarkRead: (conversationId: string) => void;
  onStartVoiceCall: (peerUserId: string) => void;
  onSimulateIncomingCall: (peerUserId: string) => void;
  onStartChatWithUser: (userId: string) => void;
}

const EMOJI_PRESETS = ['🔥', '🎧', '✨', '❤️', '🙌', '📸', '⚡', '🎶'];

export function MessagesPage({
  currentUser,
  usersMap,
  conversations,
  activeConversationId,
  messagesMap,
  isDemoMode,
  onSelectConversation,
  onSendMessage,
  onTypingChange,
  onMarkRead,
  onStartVoiceCall,
  onSimulateIncomingCall,
  onStartChatWithUser,
}: MessagesPageProps) {
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConversationId) || null;
  const activeMessages = activeConv ? messagesMap[activeConv.id] || [] : [];
  const otherId = activeConv?.participantIds.find((id) => id !== currentUser.uid) ?? '';
  const otherUser = usersMap.get(otherId);
  const otherIsTyping = Boolean(activeConv && otherId && activeConv.typingBy?.[otherId]);

  useEffect(() => {
    if (activeConv) {
      onMarkRead(activeConv.id);
    }
  }, [activeConv?.id, activeMessages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [activeMessages.length, activeConv?.id, reducedMotion]);

  const handleInputChange = (val: string) => {
    setDraft(val);
    if (!activeConv) return;
    onTypingChange(activeConv.id, val.trim().length > 0);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      onTypingChange(activeConv.id, false);
    }, 2000);
  };

  const handleSendText = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeConv || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft('');
    setShowEmoji(false);
    onTypingChange(activeConv.id, false);

    const msg: ChatMessage = {
      id: makeId('msg'),
      senderId: currentUser.uid,
      text,
      type: 'text',
      readBy: [currentUser.uid],
      createdAt: new Date().toISOString(),
    };
    setSending(true);
    try {
      await onSendMessage(activeConv, msg);
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async (file: File | undefined) => {
    if (!file || !activeConv) return;
    setSending(true);
    try {
      const compressed = await compressImageFile(file, 1080, 0.82);
      let imageUrl = compressed.previewUrl;
      if (!isDemoMode) {
        imageUrl = await uploadMediaWithProgress(
          `messages/${activeConv.id}/${currentUser.uid}/${Date.now()}.jpg`,
          compressed.blob,
          () => {},
          compressed.previewUrl
        );
      }
      const msg: ChatMessage = {
        id: makeId('msg'),
        senderId: currentUser.uid,
        imageUrl,
        type: 'image',
        readBy: [currentUser.uid],
        createdAt: new Date().toISOString(),
      };
      await onSendMessage(activeConv, msg);
    } finally {
      setSending(false);
    }
  };

  const directoryContacts = Array.from(usersMap.values()).filter(
    (u) => u.uid !== currentUser.uid
  );

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-6 sm:pt-6 h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-3rem)]">
      <div className="h-full rounded-none sm:rounded-2xl border-y sm:border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Conversation List Sidebar */}
        <aside
          className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 dark:border-white/10 flex flex-col ${
            activeConv ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <h1 className="font-display text-lg font-bold">Messages</h1>
            <span className="text-xs text-slate-400 tabular-nums">
              {conversations.length} chats
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {conversations.map((conv) => {
              const peerId = conv.participantIds.find((id) => id !== currentUser.uid) ?? '';
              const peer = usersMap.get(peerId);
              const unread = conv.unreadBy?.[currentUser.uid] ?? 0;
              const selected = conv.id === activeConv?.id;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
                    selected
                      ? 'bg-slate-100 dark:bg-white/10'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={peer?.avatarUrl || currentUser.avatarUrl}
                      alt={peer?.displayName || 'Creator'}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    {peer?.isOnline && (
                      <span
                        title="Online"
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#12121C]"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">
                        {peer?.displayName || 'PULSR Creator'}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conv.typingBy?.[peerId]
                          ? 'Typing...'
                          : conv.lastMessage || 'Start a conversation'}
                      </span>
                      {unread > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-pink-500 text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Quick Start Chat Section */}
            <div className="p-4 space-y-2">
              <p className="text-xs font-medium text-slate-400">Start a chat</p>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {directoryContacts.map((u) => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => onStartChatWithUser(u.uid)}
                    className="flex flex-col items-center gap-1 min-w-[60px] p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="text-[11px] truncate max-w-[58px]">{u.displayName.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Active Chat Screen */}
        <section
          className={`md:col-span-7 lg:col-span-8 flex flex-col h-full ${
            activeConv ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConv && otherUser ? (
            <>
              {/* Chat Header with Voice Call Button */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectConversation(null)}
                    aria-label="Back to conversations"
                    className="md:hidden min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={otherUser.avatarUrl}
                    alt={otherUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{otherUser.displayName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {otherIsTyping ? 'Typing...' : otherUser.isOnline ? 'Online now' : 'Offline'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isDemoMode && (
                    <button
                      type="button"
                      onClick={() => onSimulateIncomingCall(otherUser.uid)}
                      aria-label="Test incoming voice call"
                      className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium flex items-center gap-1.5"
                    >
                      <PhoneIncoming className="w-3.5 h-3.5 text-violet-500" />
                      <span className="hidden sm:inline">Test Ring</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onStartVoiceCall(otherUser.uid)}
                    aria-label={`Voice call ${otherUser.displayName}`}
                    className="min-h-[40px] px-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-95"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </button>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50 dark:bg-[#09090F]/40">
                {activeMessages.map((msg) => {
                  const isMine = msg.senderId === currentUser.uid;
                  const isSeen = otherId ? msg.readBy.includes(otherId) : false;

                  if (msg.type === 'call') {
                    const missed = msg.callStatus === 'missed' || msg.callStatus === 'declined';
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#161624] border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
                          {missed ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span>
                            Voice call {msg.callStatus}
                            {msg.callDurationSec && msg.callDurationSec > 0
                              ? ` · ${formatDuration(msg.callDurationSec)}`
                              : ''}
                          </span>
                          <span className="text-slate-400">
                            {formatRelativeTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={msg.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18 }}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm space-y-1.5 ${
                          isMine
                            ? 'bg-gradient-to-br from-violet-600 to-pink-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-[#191928] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-bl-md'
                        }`}
                      >
                        {msg.type === 'image' && msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Shared attachment"
                            className="rounded-xl max-h-60 object-cover"
                          />
                        )}
                        {msg.text && <p className="break-words">{msg.text}</p>}

                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] ${
                            isMine ? 'text-white/75' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatRelativeTime(msg.createdAt)}</span>
                          {isMine &&
                            (isSeen ? (
                              <CheckCheck className="w-3.5 h-3.5" aria-label="Seen" />
                            ) : (
                              <Check className="w-3.5 h-3.5" aria-label="Delivered" />
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* Emoji Quick Bar */}
              {showEmoji && (
                <div className="px-4 py-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-[#12121C]">
                  {EMOJI_PRESETS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleInputChange(`${draft}${em}`)}
                      className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-lg"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {/* Message Composer */}
              <form
                onSubmit={handleSendText}
                className="p-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-[#12121C]"
              >
                <button
                  type="button"
                  onClick={() => setShowEmoji((s) => !s)}
                  aria-label="Toggle emoji picker"
                  className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <label
                  aria-label="Send image"
                  className="cursor-pointer min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <ImagePlus className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleSendImage(e.target.files?.[0])}
                  />
                </label>

                <input
                  type="text"
                  value={draft}
                  maxLength={2000}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 h-11 px-4 rounded-xl bg-slate-100 dark:bg-[#0B0B12] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />

                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label="Send message"
                  className="h-11 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold flex items-center justify-center disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <h2 className="font-display text-xl font-bold">Real-time Direct Messaging</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                Select a conversation on the left to chat, share photos, or start a 1-to-1 voice
                call.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
