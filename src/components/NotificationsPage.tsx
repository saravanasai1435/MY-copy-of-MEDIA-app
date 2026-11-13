import { Bell, CheckCheck, Heart, MessageCircle, PhoneMissed, Radio, UserPlus } from 'lucide-react';
import { formatRelativeTime } from '../lib/formatters';
import type { AppNotification, UserProfile } from '../types/pulsr';

interface NotificationsPageProps {
  notifications: AppNotification[];
  usersMap: Map<string, UserProfile>;
  onMarkAllRead: () => void;
  onOpenProfile: (userId: string) => void;
}

export function NotificationsPage({
  notifications,
  usersMap,
  onMarkAllRead,
  onOpenProfile,
}: NotificationsPageProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const iconFor = (type: AppNotification['type']) => {
    if (type === 'like') return <Heart className="w-4 h-4 text-pink-500" />;
    if (type === 'comment') return <MessageCircle className="w-4 h-4 text-violet-500" />;
    if (type === 'follow') return <UserPlus className="w-4 h-4 text-emerald-500" />;
    if (type === 'subscribe') return <Radio className="w-4 h-4 text-amber-500" />;
    return <PhoneMissed className="w-4 h-4 text-rose-500" />;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 lg:pt-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Likes, comments, follows, channel subscribers, and missed calls.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-pink-500" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] p-12 text-center">
          <Bell className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold">All caught up</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Activity from your posts, channels, and calls will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121C] divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
          {notifications.map((item) => {
            const actor = usersMap.get(item.actorId);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => actor && onOpenProfile(actor.uid)}
                className={`w-full px-4 py-3.5 flex items-center gap-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${
                  !item.read ? 'bg-pink-500/[0.04]' : ''
                }`}
              >
                <div className="relative shrink-0">
                  {actor?.avatarUrl ? (
                    <img
                      src={actor.avatarUrl}
                      alt={actor.displayName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-sm">
                      P
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-[#12121C] border border-slate-200 dark:border-white/10 flex items-center justify-center">
                    {iconFor(item.type)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 dark:text-slate-100">{item.text}</p>
                  <span className="text-xs text-slate-400">{formatRelativeTime(item.createdAt)}</span>
                </div>

                {!item.read && <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
