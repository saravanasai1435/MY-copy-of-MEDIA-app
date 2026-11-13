import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { buildConversationId } from '../lib/formatters';
import { compressBlobToMaxDataUrl } from '../lib/imageCompression';
import {
  SEED_CHANNELS,
  SEED_COMMENTS,
  SEED_POSTS,
  SEED_SHOTS,
  SEED_USERS,
} from '../lib/seedData';
import type {
  AppNotification,
  Channel,
  ChatMessage,
  Comment,
  Conversation,
  Post,
  Shot,
  UserProfile,
} from '../types/pulsr';

const SEED_USER_IDS = new Set(SEED_USERS.map((u) => u.uid));
const SEED_POST_IDS = new Set(SEED_POSTS.map((p) => p.id));
const SEED_SHOT_IDS = new Set(SEED_SHOTS.map((s) => s.id));
const SEED_CHANNEL_IDS = new Set(SEED_CHANNELS.map((c) => c.id));

export function isSeedEntity(id: string, kind: 'user' | 'post' | 'shot' | 'channel'): boolean {
  if (kind === 'user') return SEED_USER_IDS.has(id);
  if (kind === 'post') return SEED_POST_IDS.has(id);
  if (kind === 'shot') return SEED_SHOT_IDS.has(id);
  return SEED_CHANNEL_IDS.has(id);
}

export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const seed = SEED_USERS.find((u) => u.uid === uid);
  if (seed) return seed;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export async function upsertUserProfile(
  profile: UserProfile,
  privateEmail?: string | null
): Promise<void> {
  try {
    await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
    if (privateEmail) {
      await setDoc(
        doc(db, 'users', profile.uid, 'private', 'info'),
        {
          uid: profile.uid,
          email: privateEmail,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
  }
}

export async function uploadMediaWithProgress(
  path: string,
  fileOrBlob: Blob,
  onProgress: (percent: number) => void,
  fallbackUrl?: string
): Promise<string> {
  onProgress(8);
  try {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, fileOrBlob);
    const url = await new Promise<string>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error('Storage upload timed out'));
      }, 5_000);

      task.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(Math.max(10, Math.min(98, pct)));
          }
        },
        (err) => {
          window.clearTimeout(timeoutId);
          reject(err);
        },
        async () => {
          window.clearTimeout(timeoutId);
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            onProgress(100);
            resolve(downloadUrl);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
    return url;
  } catch {
    // Graceful fallback when Firebase Storage bucket is not yet enabled on the project
    onProgress(65);
    await new Promise((r) => setTimeout(r, 120));
    if (fallbackUrl && fallbackUrl.length <= 220_000) {
      onProgress(100);
      return fallbackUrl;
    }
    if (fileOrBlob.type.startsWith('image/') || fallbackUrl?.startsWith('data:image/')) {
      const compactUrl = await compressBlobToMaxDataUrl(fileOrBlob, 220_000);
      onProgress(100);
      return compactUrl;
    }
    onProgress(100);
    return fallbackUrl || URL.createObjectURL(fileOrBlob);
  }
}

export function subscribePublicDirectory(
  onUsers: (users: UserProfile[]) => void,
  onPosts: (posts: Post[]) => void,
  onShots: (shots: Shot[]) => void,
  onChannels: (channels: Channel[]) => void
): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      query(collection(db, 'users'), limit(60)),
      (snap) => {
        const live = snap.docs.map((d) => d.data() as UserProfile);
        const byId = new Map<string, UserProfile>();
        SEED_USERS.forEach((u) => byId.set(u.uid, u));
        live.forEach((u) => byId.set(u.uid, u));
        onUsers(Array.from(byId.values()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(40)),
      (snap) => {
        const live = snap.docs.map((d) => d.data() as Post);
        const byId = new Map<string, Post>();
        live.forEach((p) => byId.set(p.id, p));
        SEED_POSTS.forEach((p) => {
          if (!byId.has(p.id)) byId.set(p.id, p);
        });
        onPosts(
          Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'posts')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'shots'), orderBy('createdAt', 'desc'), limit(30)),
      (snap) => {
        const live = snap.docs.map((d) => d.data() as Shot);
        const byId = new Map<string, Shot>();
        live.forEach((s) => byId.set(s.id, s));
        SEED_SHOTS.forEach((s) => {
          if (!byId.has(s.id)) byId.set(s.id, s);
        });
        onShots(
          Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'shots')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'channels'), limit(40)),
      (snap) => {
        const live = snap.docs.map((d) => d.data() as Channel);
        const byId = new Map<string, Channel>();
        SEED_CHANNELS.forEach((c) => byId.set(c.id, c));
        live.forEach((c) => byId.set(c.id, c));
        onChannels(Array.from(byId.values()));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'channels')
    )
  );

  return () => unsubs.forEach((u) => u());
}

export function subscribeUserRelations(
  uid: string,
  onFollows: (followingIds: Set<string>) => void,
  onSubs: (channelIds: Set<string>) => void,
  onSaved: (postIds: Set<string>) => void,
  onNotifications: (items: AppNotification[]) => void
): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      query(collection(db, 'follows'), where('followerId', '==', uid)),
      (snap) => {
        const set = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data() as { followingId?: string };
          if (data.followingId) set.add(data.followingId);
        });
        onFollows(set);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'follows')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'subscriptions'), where('userId', '==', uid)),
      (snap) => {
        const set = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data() as { channelId?: string };
          if (data.channelId) set.add(data.channelId);
        });
        onSubs(set);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'subscriptions')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'users', uid, 'saved'),
      (snap) => {
        const set = new Set<string>();
        snap.docs.forEach((d) => set.add(d.id));
        onSaved(set);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/saved`)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'notifications'), where('recipientId', '==', uid)),
      (snap) => {
        const sorted = snap.docs
          .map((d) => d.data() as AppNotification)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 40);
        onNotifications(sorted);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
    )
  );

  return () => unsubs.forEach((u) => u());
}

export function subscribeComments(
  targetType: 'post' | 'shot',
  targetId: string,
  onComments: (comments: Comment[]) => void
): () => void {
  const seedForTarget = SEED_COMMENTS.filter(
    (c) => c.targetType === targetType && c.targetId === targetId
  );

  return onSnapshot(
    query(collection(db, 'comments'), where('targetId', '==', targetId)),
    (snap) => {
      const live = snap.docs
        .map((d) => d.data() as Comment)
        .filter((c) => c.targetType === targetType);
      const map = new Map<string, Comment>();
      seedForTarget.forEach((c) => map.set(c.id, c));
      live.forEach((c) => map.set(c.id, c));
      onComments(
        Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'comments')
  );
}

export async function createCommentDoc(
  comment: Comment,
  recipientId?: string,
  actorName?: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'comments', comment.id), comment);
    const col = comment.targetType === 'post' ? 'posts' : 'shots';
    if (!isSeedEntity(comment.targetId, comment.targetType)) {
      await updateDoc(doc(db, col, comment.targetId), {
        commentsCount: increment(1),
        updatedAt: new Date().toISOString(),
      });
    }
    if (recipientId && recipientId !== comment.authorId && !isSeedEntity(recipientId, 'user')) {
      await pushNotification({
        id: makeId('notif'),
        recipientId,
        actorId: comment.authorId,
        type: 'comment',
        targetId: comment.targetId,
        text: `${actorName || 'Someone'} commented: "${comment.text.slice(0, 60)}"`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `comments/${comment.id}`);
  }
}

export async function createPostDoc(post: Post): Promise<void> {
  try {
    await setDoc(doc(db, 'posts', post.id), post);
    await updateDoc(doc(db, 'users', post.authorId), {
      postsCount: increment(1),
      updatedAt: new Date().toISOString(),
    });
    if (post.channelId && !isSeedEntity(post.channelId, 'channel')) {
      await updateDoc(doc(db, 'channels', post.channelId), {
        postsCount: increment(1),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `posts/${post.id}`);
  }
}

export async function createShotDoc(shot: Shot): Promise<void> {
  try {
    await setDoc(doc(db, 'shots', shot.id), shot);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `shots/${shot.id}`);
  }
}

export async function createChannelDoc(channel: Channel): Promise<void> {
  try {
    await setDoc(doc(db, 'channels', channel.id), channel);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `channels/${channel.id}`);
  }
}

export async function toggleLikeDoc(
  targetType: 'post' | 'shot',
  targetId: string,
  userId: string,
  shouldLike: boolean,
  ownerId?: string,
  actorName?: string
): Promise<void> {
  if (isSeedEntity(targetId, targetType)) return;
  const col = targetType === 'post' ? 'posts' : 'shots';
  const likeRef = doc(db, col, targetId, 'likes', userId);
  try {
    if (shouldLike) {
      await setDoc(likeRef, { userId, createdAt: new Date().toISOString() });
      await updateDoc(doc(db, col, targetId), {
        likesCount: increment(1),
        updatedAt: new Date().toISOString(),
      });
      if (ownerId && ownerId !== userId && !isSeedEntity(ownerId, 'user')) {
        await pushNotification({
          id: makeId('notif'),
          recipientId: ownerId,
          actorId: userId,
          type: 'like',
          targetId,
          text: `${actorName || 'Someone'} liked your ${targetType}.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      await deleteDoc(likeRef);
      await updateDoc(doc(db, col, targetId), {
        likesCount: increment(-1),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${col}/${targetId}/likes/${userId}`);
  }
}

export async function toggleSavePostDoc(
  userId: string,
  postId: string,
  shouldSave: boolean
): Promise<void> {
  const refDoc = doc(db, 'users', userId, 'saved', postId);
  try {
    if (shouldSave) {
      await setDoc(refDoc, { postId, createdAt: new Date().toISOString() });
    } else {
      await deleteDoc(refDoc);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/saved/${postId}`);
  }
}

export async function toggleFollowDoc(
  followerId: string,
  followingId: string,
  shouldFollow: boolean,
  actorName?: string
): Promise<void> {
  const followId = `${followerId}_${followingId}`;
  try {
    if (shouldFollow) {
      await setDoc(doc(db, 'follows', followId), {
        id: followId,
        followerId,
        followingId,
        createdAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'users', followerId), {
        followingCount: increment(1),
        updatedAt: new Date().toISOString(),
      });
      if (!isSeedEntity(followingId, 'user')) {
        await updateDoc(doc(db, 'users', followingId), {
          followersCount: increment(1),
          updatedAt: new Date().toISOString(),
        });
        await pushNotification({
          id: makeId('notif'),
          recipientId: followingId,
          actorId: followerId,
          type: 'follow',
          text: `${actorName || 'Someone'} started following you.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      await deleteDoc(doc(db, 'follows', followId));
      await updateDoc(doc(db, 'users', followerId), {
        followingCount: increment(-1),
        updatedAt: new Date().toISOString(),
      });
      if (!isSeedEntity(followingId, 'user')) {
        await updateDoc(doc(db, 'users', followingId), {
          followersCount: increment(-1),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `follows/${followId}`);
  }
}

export async function toggleSubscriptionDoc(
  userId: string,
  channel: Channel,
  shouldSubscribe: boolean,
  actorName?: string
): Promise<void> {
  const subId = `${userId}_${channel.id}`;
  try {
    if (shouldSubscribe) {
      await setDoc(doc(db, 'subscriptions', subId), {
        id: subId,
        userId,
        channelId: channel.id,
        createdAt: new Date().toISOString(),
      });
      if (!isSeedEntity(channel.id, 'channel')) {
        await updateDoc(doc(db, 'channels', channel.id), {
          subscribersCount: increment(1),
          updatedAt: new Date().toISOString(),
        });
        if (channel.ownerId !== userId && !isSeedEntity(channel.ownerId, 'user')) {
          await pushNotification({
            id: makeId('notif'),
            recipientId: channel.ownerId,
            actorId: userId,
            type: 'subscribe',
            targetId: channel.id,
            text: `${actorName || 'Someone'} subscribed to ${channel.name}.`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } else {
      await deleteDoc(doc(db, 'subscriptions', subId));
      if (!isSeedEntity(channel.id, 'channel')) {
        await updateDoc(doc(db, 'channels', channel.id), {
          subscribersCount: increment(-1),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `subscriptions/${subId}`);
  }
}

export async function pushNotification(notification: AppNotification): Promise<void> {
  try {
    await setDoc(doc(db, 'notifications', notification.id), notification);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${notification.id}`);
  }
}

export async function markNotificationsRead(notifications: AppNotification[]): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  await Promise.all(
    unread.map((n) =>
      updateDoc(doc(db, 'notifications', n.id), { read: true }).catch((error) =>
        handleFirestoreError(error, OperationType.UPDATE, `notifications/${n.id}`)
      )
    )
  );
}

// --- Messaging ---
export function subscribeConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid)),
    (snap) => {
      const sorted = snap.docs
        .map((d) => d.data() as Conversation)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      onChange(sorted);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'conversations')
  );
}

export function subscribeMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc')),
    (snap) => {
      onChange(snap.docs.map((d) => d.data() as ChatMessage));
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, `conversations/${conversationId}/messages`)
  );
}

export async function ensureConversation(uidA: string, uidB: string): Promise<Conversation> {
  const id = buildConversationId(uidA, uidB);
  const convRef = doc(db, 'conversations', id);
  try {
    const existing = await getDoc(convRef);
    if (existing.exists()) {
      return existing.data() as Conversation;
    }
    const nowIso = new Date().toISOString();
    const created: Conversation = {
      id,
      participantIds: [uidA, uidB].sort(),
      lastMessage: '',
      lastSenderId: uidA,
      lastMessageAt: nowIso,
      unreadBy: { [uidA]: 0, [uidB]: 0 },
      typingBy: { [uidA]: false, [uidB]: false },
      updatedAt: nowIso,
    };
    await setDoc(convRef, created);
    return created;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${id}`);
  }
}

export async function sendChatMessage(
  conversation: Conversation,
  message: ChatMessage
): Promise<void> {
  const convRef = doc(db, 'conversations', conversation.id);
  const msgRef = doc(db, 'conversations', conversation.id, 'messages', message.id);
  const otherId = conversation.participantIds.find((id) => id !== message.senderId) ?? message.senderId;
  const preview =
    message.type === 'image'
      ? 'Shared an image'
      : message.type === 'call'
      ? `Voice call (${message.callStatus || 'ended'})`
      : message.text || '';

  try {
    await setDoc(msgRef, message);
    await updateDoc(convRef, {
      lastMessage: preview.slice(0, 500),
      lastSenderId: message.senderId,
      lastMessageAt: message.createdAt,
      [`unreadBy.${otherId}`]: (conversation.unreadBy?.[otherId] ?? 0) + 1,
      [`typingBy.${message.senderId}`]: false,
      updatedAt: message.createdAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `conversations/${conversation.id}/messages`);
  }
}

export async function setTypingState(
  conversationId: string,
  uid: string,
  isTyping: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      [`typingBy.${uid}`]: isTyping,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Non-critical typing indicator errors can be safely ignored
  }
}

export async function markConversationRead(
  conversationId: string,
  uid: string,
  unreadMessages: ChatMessage[]
): Promise<void> {
  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      [`unreadBy.${uid}`]: 0,
      updatedAt: new Date().toISOString(),
    });
    await Promise.all(
      unreadMessages
        .filter((m) => !m.readBy.includes(uid))
        .map((m) =>
          updateDoc(doc(db, 'conversations', conversationId, 'messages', m.id), {
            readBy: [...m.readBy, uid],
          })
        )
    );
  } catch {
    // Non-fatal read receipt update
  }
}

export async function fetchUserPostsCount(uid: string): Promise<number> {
  try {
    const snap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', uid)));
    return snap.size;
  } catch {
    return 0;
  }
}
