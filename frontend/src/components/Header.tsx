'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  ClipboardList,
  Home,
  Leaf,
  Settings,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { notificationService } from '@/services/notificationService';
import NotificationDropdown from './NotificationDropdown';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/sala', label: 'Sala', icon: Home },
  { href: '/seguimientos', label: 'Ciclos', icon: ClipboardList },
  { href: '/automatizaciones', label: 'Automatizaciones', icon: Zap },
  { href: '/artefactos', label: 'Dispositivos', icon: Settings },
];

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === '/sala';
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadUnreadCount() {
    try {
      const { count } = await notificationService.countUnread();
      setUnreadCount(count);
    } catch {
      // noop
    }
  }

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/78 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {!isHome ? (
            <Link
              href="/sala"
              className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : null}

          <Link href="/sala" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/40 bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-black/30">
              <Leaf className="h-5 w-5 text-emerald-950" />
            </div>
            <div className="min-w-0">
              <p className="font-display truncate text-sm font-semibold text-zinc-100">Cultivo Control</p>
              <p className="truncate text-xs text-zinc-400">Panel operativo</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-emerald-500/18 text-emerald-300'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className={cn(
                'relative rounded-xl border p-2 transition-colors',
                showNotifications
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                  : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

            {showNotifications ? (
              <NotificationDropdown
                onClose={() => setShowNotifications(false)}
                onMarkAsRead={() => setUnreadCount((prev) => Math.max(0, prev - 1))}
              />
            ) : null}
          </div>
        </div>
      </div>
    </motion.header>
  );
}

