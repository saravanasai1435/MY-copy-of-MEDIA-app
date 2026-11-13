import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Bell,
  Code2,
  Compass,
  Film,
  Home,
  LogOut,
  MessageCircle,
  Moon,
  PlusSquare,
  Radio,
  Sun,
  User,
} from 'lucide-react';
import type { NavTab, ThemeMode, UserProfile } from '../types/pulsr';
import { PulsrLogo } from './PulsrLogo';

interface AppShellProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenCreate: () => void;
  currentUser: UserProfile;
  theme: ThemeMode;
  onToggleTheme: () => void;
  unreadNotifications: number;
  unreadMessages: number;
  isDemoMode: boolean;
  onSignOut: () => void;
  children: ReactNode;
}

export function AppShell({
  activeTab,
  onSelectTab,
  onOpenCreate,
  currentUser,
  theme,
  onToggleTheme,
  unreadNotifications,
  unreadMessages,
  isDemoMode,
  onSignOut,
  children,
}: AppShellProps) {
  const reducedMotion = useReducedMotion();

  const desktopNav: {
    id: NavTab;
    label: string;
    icon: typeof Home;
    badge?: number;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shots', label: 'Shots', icon: Film },
    { id: 'channels', label: 'Channels', icon: Radio },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'messages', label: 'Messages', icon: MessageCircle, badge: unreadMessages },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const mobileTabs: {
    id: NavTab | 'create';
    label: string;
    icon: typeof Home;
    badge?: number;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shots', label: 'Shots', icon: Film },
    { id: 'create', label: 'Create', icon: PlusSquare },
    { id: 'messages', label: 'Messages', icon: MessageCircle, badge: unreadMessages },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const isImmersiveShots = activeTab === 'shots';

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 dark:bg-[#09090F] dark:text-slate-100 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 flex-col justify-between sticky top-0 h-screen border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0C0C14]/90 backdrop-blur-xl px-4 py-6 z-30">
        <div className="space-y-6">
          <div className="px-2">
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-xl"
            >
              <PulsrLogo size="md" showTagline />
            </button>
          </div>

          <nav aria-label="Primary navigation" className="space-y-1">
            {desktopNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-pink-500' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.badge && item.badge > 0 ? (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[11px] font-semibold flex items-center justify-center tabular-nums">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}

            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-3 w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 hover:opacity-95 transition-opacity"
            >
              <PlusSquare className="w-4 h-4" />
              <span>Create</span>
            </button>
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-white/10">
          {/* By DEV item with animated </> badge icon */}
          <button
            type="button"
            onClick={() => onSelectTab('by-dev')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'by-dev'
                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <motion.span
                animate={
                  reducedMotion
                    ? undefined
                    : { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }
                }
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/20 via-pink-500/20 to-amber-500/20 border border-pink-500/30 flex items-center justify-center text-pink-500"
              >
                <Code2 className="w-3.5 h-3.5" />
              </motion.span>
              <span>By DEV</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">&lt;/&gt;</span>
          </button>

          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-600" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              aria-label={isDemoMode ? 'Exit demo to sign in' : 'Sign out'}
              className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-rose-500/15 text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-colors flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('profile')}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/15 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{currentUser.displayName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                @{currentUser.username}
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Region */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Mobile Top Header (hidden during full-screen Shots) */}
        {!isImmersiveShots && (
          <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-white/90 dark:bg-[#09090F]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              aria-label="PULSR Home"
              className="flex items-center"
            >
              <PulsrLogo variant="full" size="sm" />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectTab('explore')}
                aria-label="Search and Explore"
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
                  activeTab === 'explore'
                    ? 'text-pink-500 bg-pink-500/10'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Compass className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('channels')}
                aria-label="Channels"
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
                  activeTab === 'channels'
                    ? 'text-pink-500 bg-pink-500/10'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Radio className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('notifications')}
                aria-label="Notifications"
                className={`relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
                  activeTab === 'notifications'
                    ? 'text-pink-500 bg-pink-500/10'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-pink-500" />
                )}
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </header>
        )}

        <main
          className={`flex-1 w-full ${
            isImmersiveShots ? 'pb-16 lg:pb-0' : 'pb-20 lg:pb-10'
          }`}
        >
          {children}

          {/* Compact app footer on standard scrollable pages */}
          {!isImmersiveShots && activeTab !== 'messages' && activeTab !== 'by-dev' && (
            <footer className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/70 dark:border-white/10 mt-10">
              <span>PULSR — Feel the feed.</span>
              <button
                type="button"
                onClick={() => onSelectTab('by-dev')}
                className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Code2 className="w-3.5 h-3.5 text-pink-500" />
                <span>By DEV</span>
              </button>
            </footer>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (5 tabs, <= 64px height) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#0C0C14]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 grid grid-cols-5 items-center px-1"
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isCreate = tab.id === 'create';
          const isActive = !isCreate && activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (isCreate) onOpenCreate();
                else onSelectTab(tab.id as NavTab);
              }}
              aria-label={tab.label}
              className="relative h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl"
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-tab-indicator"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-x-3 top-0.5 h-0.5 rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500"
                />
              )}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isCreate
                      ? 'text-pink-500'
                      : isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight ${
                  isActive
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
