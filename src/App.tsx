import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { AuthScreen } from './components/AuthScreen';
import { ByDevPage } from './components/ByDevPage';
import { ChannelsPage } from './components/ChannelsPage';
import { CommentDrawer } from './components/CommentDrawer';
import { CreateSheet, type CreateMode } from './components/CreateSheet';
import { ExplorePage } from './components/ExplorePage';
import { FeedPage } from './components/FeedPage';
import { MessagesPage } from './components/MessagesPage';
import { NotificationsPage } from './components/NotificationsPage';
import { ProfilePage } from './components/ProfilePage';
import { ShotsPage } from './components/ShotsPage';
import { VoiceCallOverlay } from './components/VoiceCallOverlay';
import { useTheme } from './hooks/useTheme';
import { useVoiceCall } from './hooks/useVoiceCall';
import { auth, testFirestoreConnection } from './lib/firebase';
import { buildConversationId, sanitizeUsername } from './lib/formatters';
import {
  buildSeedConversations,
  buildSeedMessages,
  buildSeedNotifications,
  DEMO_CURRENT_USER,
  SEED_CHANNELS,
  SEED_POSTS,
  SEED_SHOTS,
  SEED_USERS,
} from './lib/seedData';
import {
  createChannelDoc,
  createPostDoc,
  createShotDoc,
  ensureConversation,
  fetchUserProfile,
  isSeedEntity,
  makeId,
  markConversationRead,
  markNotificationsRead,
  sendChatMessage,
  setTypingState,
  subscribeConversations,
  subscribeMessages,
  subscribePublicDirectory,
  subscribeUserRelations,
  toggleFollowDoc,
  toggleLikeDoc,
  toggleSavePostDoc,
  toggleSubscriptionDoc,
  upsertUserProfile,
} from './services/dataService';
import type {
  AppNotification,
  Channel,
  ChatMessage,
  Conversation,
  NavTab,
  Post,
  Shot,
  ToastItem,
  UserProfile,
} from './types/pulsr';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const reducedMotion = useReducedMotion();

  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(
    initialAutostart ? DEMO_CURRENT_USER : null
  );
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(initialAutostart);
  const [showPublicByDev, setShowPublicByDev] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Core state
  const [users, setUsers] = useState<UserProfile[]>(SEED_USERS);
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [shots, setShots] = useState<Shot[]>(SEED_SHOTS);
  const [channels, setChannels] = useState<Channel[]>(SEED_CHANNELS);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // User relation sets
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(() => new Set());
  const [likedShotIds, setLikedShotIds] = useState<Set<string>>(() => new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(() => new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(
    () => new Set(['user_saravana', 'user_kenji'])
  );
  const [subscribedChannelIds, setSubscribedChannelIds] = useState<Set<string>>(
    () => new Set(['ch_soundcraft', 'ch_framelight'])
  );

  // Messaging & Notifications
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    buildSeedConversations(DEMO_CURRENT_USER.uid)
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    () => buildSeedConversations(DEMO_CURRENT_USER.uid)[0]?.id ?? null
  );
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(() =>
    buildSeedMessages(DEMO_CURRENT_USER.uid)
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    buildSeedNotifications(DEMO_CURRENT_USER.uid)
  );

  // Modals & Drawers
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('post');
  const [commentTarget, setCommentTarget] = useState<{
    type: 'post' | 'shot';
    id: string;
    ownerId: string;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (message: string, tone: ToastItem['tone'] = 'info') => {
      const id = makeId('toast');
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  // Boot Firestore connection check
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        if (!isDemoMode) {
          setCurrentUser(null);
          setNeedsOnboarding(false);
        }
        setAuthReady(true);
        return;
      }

      setIsDemoMode(false);
      setShowPublicByDev(false);
      setActiveConversationId(null);
      setConversations([]);
      setMessagesMap({});
      setNotifications([]);
      setFollowingIds(new Set());
      setSubscribedChannelIds(new Set());
      setSavedPostIds(new Set());
      setLikedPostIds(new Set());
      setLikedShotIds(new Set());
      try {
        const existing = await fetchUserProfile(user.uid);
        if (existing && existing.onboarded) {
          setCurrentUser(existing);
          setNeedsOnboarding(false);
        } else {
          const fallbackName = user.displayName || user.email?.split('@')[0] || 'Creator';
          setCurrentUser({
            uid: user.uid,
            username: sanitizeUsername(fallbackName) || `user${user.uid.slice(0, 5)}`,
            displayName: fallbackName,
            bio: '',
            avatarUrl: user.photoURL || DEMO_CURRENT_USER.avatarUrl,
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            isOnline: true,
            onboarded: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setNeedsOnboarding(true);
        }
      } catch {
        setFeedError('Could not load your profile. Check Firestore configuration.');
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [isDemoMode]);

  // Real-time Firestore subscriptions when signed into Firebase
  useEffect(() => {
    if (!firebaseUser || isDemoMode || needsOnboarding) return;
    setFeedLoading(true);
    setFeedError(null);

    const unsubDir = subscribePublicDirectory(
      (u) => {
        setUsers(u);
        setFeedLoading(false);
      },
      setPosts,
      setShots,
      setChannels
    );

    const unsubRel = subscribeUserRelations(
      firebaseUser.uid,
      setFollowingIds,
      setSubscribedChannelIds,
      setSavedPostIds,
      (notifs) => {
        setNotifications(notifs);
      }
    );

    const unsubConvs = subscribeConversations(firebaseUser.uid, (convs) => {
      setConversations(convs);
      setActiveConversationId((prev) => {
        if (prev && convs.some((c) => c.id === prev)) return prev;
        if (prev && prev.split('__').includes(firebaseUser.uid)) return prev;
        return convs[0]?.id ?? null;
      });
    });

    return () => {
      unsubDir();
      unsubRel();
      unsubConvs();
    };
  }, [firebaseUser, isDemoMode, needsOnboarding]);

  // Subscribe to messages for active Firestore conversation
  useEffect(() => {
    if (
      !firebaseUser ||
      isDemoMode ||
      needsOnboarding ||
      !activeConversationId ||
      !activeConversationId.split('__').includes(firebaseUser.uid)
    ) {
      return;
    }
    const unsub = subscribeMessages(activeConversationId, (msgs) => {
      setMessagesMap((prev) => ({ ...prev, [activeConversationId]: msgs }));
    });
    return () => unsub();
  }, [firebaseUser, isDemoMode, needsOnboarding, activeConversationId]);

  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach((u) => map.set(u.uid, u));
    if (currentUser) map.set(currentUser.uid, currentUser);
    return map;
  }, [users, currentUser]);

  const channelsMap = useMemo(() => {
    const map = new Map<string, Channel>();
    channels.forEach((c) => map.set(c.id, c));
    return map;
  }, [channels]);

  const handleLogDemoCallMessage = useCallback(
    (
      conversationId: string,
      peerId: string,
      status: 'missed' | 'declined' | 'ended' | 'busy',
      durationSec: number
    ) => {
      if (!currentUser) return;
      const nowIso = new Date().toISOString();
      const msg: ChatMessage = {
        id: makeId('msg'),
        senderId: currentUser.uid,
        type: 'call',
        callStatus: status,
        callDurationSec: durationSec,
        readBy: [currentUser.uid],
        createdAt: nowIso,
      };
      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), msg],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: `Voice call (${status})`,
                lastMessageAt: nowIso,
                updatedAt: nowIso,
              }
            : c
        )
      );
      if (status === 'missed') {
        setNotifications((prev) => [
          {
            id: makeId('notif'),
            recipientId: currentUser.uid,
            actorId: peerId,
            type: 'missed_call',
            text: `Missed voice call with ${usersMap.get(peerId)?.displayName || 'Creator'}.`,
            read: false,
            createdAt: nowIso,
          },
          ...prev,
        ]);
      }
    },
    [currentUser, usersMap]
  );

  const voiceCall = useVoiceCall({
    currentUserId: currentUser?.uid ?? null,
    currentUserName: currentUser?.displayName ?? 'PULSR User',
    isDemoMode,
    onLogDemoCallMessage: handleLogDemoCallMessage,
    onToast: pushToast,
  });

  // --- Optimistic Action Handlers ---
  const handleToggleLikePost = async (post: Post) => {
    if (!currentUser) return;
    const isLiked = likedPostIds.has(post.id);
    const delta = isLiked ? -1 : 1;

    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likesCount: Math.max(0, p.likesCount + delta) } : p
      )
    );

    if (!isDemoMode) {
      try {
        await toggleLikeDoc(
          'post',
          post.id,
          currentUser.uid,
          !isLiked,
          post.authorId,
          currentUser.displayName
        );
      } catch {
        pushToast('Failed to update like.', 'error');
      }
    }
  };

  const handleToggleLikeShot = async (shot: Shot) => {
    if (!currentUser) return;
    const isLiked = likedShotIds.has(shot.id);
    const delta = isLiked ? -1 : 1;

    setLikedShotIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(shot.id);
      else next.add(shot.id);
      return next;
    });
    setShots((prev) =>
      prev.map((s) =>
        s.id === shot.id ? { ...s, likesCount: Math.max(0, s.likesCount + delta) } : s
      )
    );

    if (!isDemoMode) {
      try {
        await toggleLikeDoc(
          'shot',
          shot.id,
          currentUser.uid,
          !isLiked,
          shot.authorId,
          currentUser.displayName
        );
      } catch {
        pushToast('Failed to update like.', 'error');
      }
    }
  };

  const handleToggleSavePost = async (post: Post) => {
    if (!currentUser) return;
    const isSaved = savedPostIds.has(post.id);
    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    pushToast(isSaved ? 'Removed from saved' : 'Saved to your collection', 'success');

    if (!isDemoMode) {
      await toggleSavePostDoc(currentUser.uid, post.id, !isSaved).catch(() => {});
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    if (!currentUser || targetUserId === currentUser.uid) return;
    const isFollowing = followingIds.has(targetUserId);
    const delta = isFollowing ? -1 : 1;

    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(targetUserId);
      else next.add(targetUserId);
      return next;
    });
    setCurrentUser((prev) =>
      prev ? { ...prev, followingCount: Math.max(0, prev.followingCount + delta) } : prev
    );
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === targetUserId
          ? { ...u, followersCount: Math.max(0, u.followersCount + delta) }
          : u
      )
    );

    if (!isDemoMode) {
      await toggleFollowDoc(
        currentUser.uid,
        targetUserId,
        !isFollowing,
        currentUser.displayName
      ).catch(() => {});
    }
  };

  const handleToggleSubscribe = async (channel: Channel) => {
    if (!currentUser) return;
    const isSub = subscribedChannelIds.has(channel.id);
    const delta = isSub ? -1 : 1;

    setSubscribedChannelIds((prev) => {
      const next = new Set(prev);
      if (isSub) next.delete(channel.id);
      else next.add(channel.id);
      return next;
    });
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channel.id
          ? { ...c, subscribersCount: Math.max(0, c.subscribersCount + delta) }
          : c
      )
    );
    pushToast(isSub ? `Unsubscribed from ${channel.name}` : `Subscribed to ${channel.name}`, 'info');

    if (!isDemoMode) {
      await toggleSubscriptionDoc(
        currentUser.uid,
        channel,
        !isSub,
        currentUser.displayName
      ).catch(() => {});
    }
  };

  const handlePublishPost = async (post: Post) => {
    setPosts((prev) => [post, ...prev]);
    if (!isDemoMode) {
      try {
        await createPostDoc(post);
      } catch (err) {
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
        throw err;
      }
    }
  };

  const handlePublishShot = async (shot: Shot) => {
    setShots((prev) => [shot, ...prev]);
    if (!isDemoMode) {
      try {
        await createShotDoc(shot);
      } catch (err) {
        setShots((prev) => prev.filter((s) => s.id !== shot.id));
        throw err;
      }
    }
  };

  const handleCreateChannel = async (channel: Channel) => {
    setChannels((prev) => [channel, ...prev]);
    setSubscribedChannelIds((prev) => new Set(prev).add(channel.id));
    if (!isDemoMode) {
      await createChannelDoc(channel);
      await toggleSubscriptionDoc(currentUser!.uid, channel, true, currentUser!.displayName);
    }
  };

  const handleStartChatWithUser = async (peerId: string) => {
    if (!currentUser) return;
    const convId = buildConversationId(currentUser.uid, peerId);
    const existing = conversations.find((c) => c.id === convId);
    if (existing) {
      setActiveConversationId(existing.id);
      setActiveTab('messages');
      return;
    }

    if (isDemoMode) {
      const nowIso = new Date().toISOString();
      const created: Conversation = {
        id: convId,
        participantIds: [currentUser.uid, peerId].sort(),
        lastMessage: '',
        lastSenderId: currentUser.uid,
        lastMessageAt: nowIso,
        unreadBy: { [currentUser.uid]: 0, [peerId]: 0 },
        typingBy: {},
        updatedAt: nowIso,
      };
      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.id);
      setActiveTab('messages');
    } else {
      const conv = await ensureConversation(currentUser.uid, peerId);
      setConversations((prev) =>
        prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
      );
      setActiveConversationId(conv.id);
      setActiveTab('messages');
    }
  };

  const handleSendMessage = async (conv: Conversation, msg: ChatMessage) => {
    setMessagesMap((prev) => ({
      ...prev,
      [conv.id]: [...(prev[conv.id] || []), msg],
    }));
    const preview =
      msg.type === 'image' ? 'Shared an image' : msg.text || '';
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              lastMessage: preview,
              lastSenderId: msg.senderId,
              lastMessageAt: msg.createdAt,
              updatedAt: msg.createdAt,
            }
          : c
      )
    );
    if (!isDemoMode) {
      await sendChatMessage(conv, msg);
    }
  };

  const handleShare = async (title: string, caption: string) => {
    const shareText = `${title} — ${caption.slice(0, 120)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url: window.location.href });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
        pushToast('Link copied to clipboard', 'success');
      }
    } catch {
      pushToast('Share link ready', 'info');
    }
  };

  const handleCompleteOnboarding = async (profile: UserProfile) => {
    await upsertUserProfile(profile, firebaseUser?.email);
    setCurrentUser(profile);
    setNeedsOnboarding(false);
    pushToast('Welcome to PULSR!', 'success');
  };

  const handleSaveOwnProfile = async (updated: UserProfile) => {
    setCurrentUser(updated);
    if (!isDemoMode) {
      await upsertUserProfile(updated, firebaseUser?.email);
    }
  };

  const handleEnterDemo = () => {
    setIsDemoMode(true);
    setCurrentUser(DEMO_CURRENT_USER);
    setNeedsOnboarding(false);
    setShowPublicByDev(false);
    setConversations(buildSeedConversations(DEMO_CURRENT_USER.uid));
    setMessagesMap(buildSeedMessages(DEMO_CURRENT_USER.uid));
    setNotifications(buildSeedNotifications(DEMO_CURRENT_USER.uid));
    setActiveConversationId(buildSeedConversations(DEMO_CURRENT_USER.uid)[0]?.id ?? null);
    pushToast('Demo mode active — explore PULSR!', 'info');
  };

  const handleSignOut = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setCurrentUser(null);
      setActiveTab('home');
      return;
    }
    await signOut(auth);
    setCurrentUser(null);
    setActiveTab('home');
  };

  const unreadMessages = useMemo(() => {
    if (!currentUser) return 0;
    return conversations.reduce(
      (sum, c) => sum + (c.unreadBy?.[currentUser.uid] ?? 0),
      0
    );
  }, [conversations, currentUser]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Loading Splash
  if (!authReady && !currentUser) {
    return (
      <div className="min-h-screen bg-[#09090F] flex items-center justify-center text-white">
        <div className="animate-pulse text-sm font-medium text-slate-400">Loading PULSR...</div>
      </div>
    );
  }

  // Public "By DEV" view accessible from the login screen
  if ((!currentUser || needsOnboarding) && showPublicByDev) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-slate-50 dark:bg-[#09090F] text-slate-900 dark:text-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
            <button
              type="button"
              onClick={() => setShowPublicByDev(false)}
              className="h-10 px-4 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-semibold"
            >
              Back to Sign In
            </button>
          </div>
          <ByDevPage />
        </div>
      </MotionConfig>
    );
  }

  // Auth / Onboarding Gate
  if (!currentUser || needsOnboarding) {
    return (
      <MotionConfig reducedMotion="user">
        <AuthScreen
          needsOnboarding={needsOnboarding}
          initialProfile={currentUser}
          onCompleteOnboarding={handleCompleteOnboarding}
          onEnterDemo={handleEnterDemo}
          onOpenByDev={() => setShowPublicByDev(true)}
        />
      </MotionConfig>
    );
  }

  const viewedProfile =
    (selectedProfileId && usersMap.get(selectedProfileId)) || currentUser;

  const savedPosts = posts.filter((p) => savedPostIds.has(p.id));

  return (
    <MotionConfig reducedMotion="user">
      <AppShell
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'profile') setSelectedProfileId(null);
          if (tab !== 'channels') setSelectedChannelId(null);
        }}
        onOpenCreate={() => {
          setCreateMode('post');
          setCreateOpen(true);
        }}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
        isDemoMode={isDemoMode}
        onSignOut={handleSignOut}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'home' && (
              <FeedPage
                posts={posts}
                usersMap={usersMap}
                channelsMap={channelsMap}
                currentUser={currentUser}
                likedPostIds={likedPostIds}
                savedPostIds={savedPostIds}
                followingIds={followingIds}
                subscribedChannelIds={subscribedChannelIds}
                loading={feedLoading}
                error={feedError}
                onToggleLike={handleToggleLikePost}
                onToggleSave={handleToggleSavePost}
                onToggleFollow={handleToggleFollow}
                onToggleSubscribe={handleToggleSubscribe}
                onOpenComments={(post) =>
                  setCommentTarget({ type: 'post', id: post.id, ownerId: post.authorId })
                }
                onOpenProfile={(uid) => {
                  setSelectedProfileId(uid === currentUser.uid ? null : uid);
                  setActiveTab('profile');
                }}
                onOpenChannel={(chId) => {
                  setSelectedChannelId(chId);
                  setActiveTab('channels');
                }}
                onSharePost={(post) => handleShare('PULSR Post', post.caption)}
                onOpenCreate={() => {
                  setCreateMode('post');
                  setCreateOpen(true);
                }}
              />
            )}

            {activeTab === 'shots' && (
              <ShotsPage
                shots={shots}
                usersMap={usersMap}
                currentUser={currentUser}
                likedShotIds={likedShotIds}
                followingIds={followingIds}
                onToggleLike={handleToggleLikeShot}
                onToggleFollow={handleToggleFollow}
                onOpenComments={(shot) =>
                  setCommentTarget({ type: 'shot', id: shot.id, ownerId: shot.authorId })
                }
                onOpenProfile={(uid) => {
                  setSelectedProfileId(uid === currentUser.uid ? null : uid);
                  setActiveTab('profile');
                }}
                onShareShot={(shot) => handleShare('PULSR Shot', shot.caption)}
                onOpenUploadShot={() => {
                  setCreateMode('shot');
                  setCreateOpen(true);
                }}
              />
            )}

            {activeTab === 'channels' && (
              <ChannelsPage
                channels={channels}
                posts={posts}
                usersMap={usersMap}
                currentUser={currentUser}
                subscribedChannelIds={subscribedChannelIds}
                selectedChannelId={selectedChannelId}
                isDemoMode={isDemoMode}
                onSelectChannel={setSelectedChannelId}
                onToggleSubscribe={handleToggleSubscribe}
                onCreateChannel={handleCreateChannel}
                onOpenCreateChannelPost={() => {
                  setCreateMode('channel-post');
                  setCreateOpen(true);
                }}
                onToast={pushToast}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesPage
                currentUser={currentUser}
                usersMap={usersMap}
                conversations={conversations}
                activeConversationId={activeConversationId}
                messagesMap={messagesMap}
                isDemoMode={isDemoMode}
                onSelectConversation={setActiveConversationId}
                onSendMessage={handleSendMessage}
                onTypingChange={(convId, typing) => {
                  if (!isDemoMode) setTypingState(convId, currentUser.uid, typing);
                }}
                onMarkRead={(convId) => {
                  const msgs = messagesMap[convId] || [];
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === convId
                        ? { ...c, unreadBy: { ...c.unreadBy, [currentUser.uid]: 0 } }
                        : c
                    )
                  );
                  if (!isDemoMode) markConversationRead(convId, currentUser.uid, msgs);
                }}
                onStartVoiceCall={(peerId) => {
                  if (!isDemoMode && isSeedEntity(peerId, 'user')) {
                    pushToast(
                      'Sign in a second real user account for peer-to-peer WebRTC calls, or preview in Demo Mode.',
                      'info'
                    );
                    return;
                  }
                  voiceCall.startOutgoingCall(peerId);
                }}
                onSimulateIncomingCall={voiceCall.simulateIncomingCall}
                onStartChatWithUser={handleStartChatWithUser}
              />
            )}

            {activeTab === 'explore' && (
              <ExplorePage
                users={Array.from(usersMap.values())}
                channels={channels}
                posts={posts}
                shots={shots}
                followingIds={followingIds}
                currentUser={currentUser}
                onOpenProfile={(uid) => {
                  setSelectedProfileId(uid === currentUser.uid ? null : uid);
                  setActiveTab('profile');
                }}
                onOpenChannel={(chId) => {
                  setSelectedChannelId(chId);
                  setActiveTab('channels');
                }}
                onToggleFollow={handleToggleFollow}
                onOpenComments={(post) =>
                  setCommentTarget({ type: 'post', id: post.id, ownerId: post.authorId })
                }
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsPage
                notifications={notifications}
                usersMap={usersMap}
                onMarkAllRead={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  if (!isDemoMode) markNotificationsRead(notifications).catch(() => {});
                }}
                onOpenProfile={(uid) => {
                  setSelectedProfileId(uid === currentUser.uid ? null : uid);
                  setActiveTab('profile');
                }}
              />
            )}

            {activeTab === 'profile' && (
              <ProfilePage
                profile={viewedProfile}
                isOwnProfile={viewedProfile.uid === currentUser.uid}
                isFollowing={followingIds.has(viewedProfile.uid)}
                posts={posts}
                shots={shots}
                savedPosts={savedPosts}
                theme={theme}
                isDemoMode={isDemoMode}
                onToggleTheme={toggleTheme}
                onToggleFollow={handleToggleFollow}
                onStartChat={handleStartChatWithUser}
                onSaveProfile={handleSaveOwnProfile}
                onOpenByDev={() => setActiveTab('by-dev')}
                onOpenComments={(post) =>
                  setCommentTarget({ type: 'post', id: post.id, ownerId: post.authorId })
                }
                onOpenShots={() => setActiveTab('shots')}
                onSignOut={handleSignOut}
                onBackToOwnProfile={() => setSelectedProfileId(null)}
                onToast={pushToast}
              />
            )}

            {activeTab === 'by-dev' && <ByDevPage />}
          </motion.div>
        </AnimatePresence>

        {/* Modals & Overlays */}
        <CommentDrawer
          target={commentTarget}
          onClose={() => setCommentTarget(null)}
          currentUser={currentUser}
          usersMap={usersMap}
          isDemoMode={isDemoMode}
          onCommentAdded={(type, id) => {
            if (type === 'post') {
              setPosts((prev) =>
                prev.map((p) =>
                  p.id === id ? { ...p, commentsCount: p.commentsCount + 1 } : p
                )
              );
            } else {
              setShots((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, commentsCount: s.commentsCount + 1 } : s
                )
              );
            }
          }}
        />

        <CreateSheet
          open={createOpen}
          initialMode={createMode}
          onClose={() => setCreateOpen(false)}
          currentUser={currentUser}
          channels={channels}
          isDemoMode={isDemoMode}
          onPublishPost={handlePublishPost}
          onPublishShot={handlePublishShot}
          onToast={pushToast}
        />

        <VoiceCallOverlay
          phase={voiceCall.phase}
          peer={voiceCall.peerId ? usersMap.get(voiceCall.peerId) : undefined}
          durationSec={voiceCall.durationSec}
          audioLevel={voiceCall.audioLevel}
          isMuted={voiceCall.isMuted}
          isSpeakerOn={voiceCall.isSpeakerOn}
          endReason={voiceCall.endReason}
          remoteAudioRef={voiceCall.remoteAudioRef}
          onAccept={voiceCall.acceptIncomingCall}
          onDecline={voiceCall.declineIncomingCall}
          onEnd={voiceCall.endActiveCall}
          onToggleMute={voiceCall.toggleMute}
          onToggleSpeaker={voiceCall.toggleSpeaker}
        />

        {/* Toast Stack */}
        <div
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none"
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 dark:bg-[#191928] text-white border border-white/15 shadow-xl text-xs font-medium"
              >
                {t.tone === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : t.tone === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-pink-400 shrink-0" />
                )}
                <span>{t.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </AppShell>
    </MotionConfig>
  );
}
