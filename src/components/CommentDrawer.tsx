import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Send, X } from 'lucide-react';
import { formatRelativeTime } from '../lib/formatters';
import { SEED_COMMENTS } from '../lib/seedData';
import { createCommentDoc, makeId, subscribeComments } from '../services/dataService';
import type { Comment, UserProfile } from '../types/pulsr';

interface CommentDrawerProps {
  target: { type: 'post' | 'shot'; id: string; ownerId: string } | null;
  onClose: () => void;
  currentUser: UserProfile;
  usersMap: Map<string, UserProfile>;
  isDemoMode: boolean;
  onCommentAdded: (targetType: 'post' | 'shot', targetId: string) => void;
}

export function CommentDrawer({
  target,
  onClose,
  currentUser,
  usersMap,
  isDemoMode,
  onCommentAdded,
}: CommentDrawerProps) {
  const reducedMotion = useReducedMotion();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!target) {
      setComments([]);
      return;
    }
    if (isDemoMode) {
      setComments(
        SEED_COMMENTS.filter(
          (c) => c.targetType === target.type && c.targetId === target.id
        )
      );
      return;
    }
    const unsub = subscribeComments(target.type, target.id, setComments);
    return () => unsub();
  }, [target, isDemoMode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target || !text.trim() || submitting) return;
    const clean = text.trim();
    const newComment: Comment = {
      id: makeId('cmt'),
      targetType: target.type,
      targetId: target.id,
      authorId: currentUser.uid,
      text: clean,
      createdAt: new Date().toISOString(),
    };
    setText('');
    setComments((prev) => [...prev, newComment]);
    onCommentAdded(target.type, target.id);

    if (!isDemoMode) {
      setSubmitting(true);
      try {
        await createCommentDoc(newComment, target.ownerId, currentUser.displayName);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {target && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Comments"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={reducedMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reducedMotion ? undefined : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 260 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110) onClose();
            }}
            className="relative z-10 w-full sm:max-w-lg h-[72vh] sm:h-[560px] bg-white dark:bg-[#12121D] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="sm:hidden w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-3" />

            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                Comments <span className="text-slate-400 font-normal tabular-nums">({comments.length})</span>
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close comments"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    No comments yet
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Start the conversation below.
                  </p>
                </div>
              ) : (
                comments.map((cmt) => {
                  const author = usersMap.get(cmt.authorId) || currentUser;
                  return (
                    <div key={cmt.id} className="flex items-start gap-3">
                      <img
                        src={author.avatarUrl}
                        alt={author.displayName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {author.displayName}
                          </span>
                          <span className="text-slate-400">
                            {formatRelativeTime(cmt.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 break-words">
                          {cmt.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-3.5 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 bg-slate-50/70 dark:bg-[#0C0C14]"
            >
              <input
                type="text"
                value={text}
                maxLength={800}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 h-11 px-4 rounded-xl bg-white dark:bg-[#151524] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70"
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                aria-label="Post comment"
                className="h-11 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
