'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { MobileTabBar } from './MobileTabBar';
import { MobileTopBar } from './MobileTopBar';
import { MoreSheet } from './MoreSheet';
import { ShellMetaProvider } from './ShellContext';
import { Sidebar } from './Sidebar';
import { useUnreadCount } from './useUnreadCount';

/** Rutas que se renderizan sin shell. */
const BARE_ROUTES = ['/login', '/register'];

const COLLAPSED_KEY = 'cultivo.sidebar.collapsed';

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-60 shrink-0 border-r border-edge bg-surface p-3 lg:block">
        <Skeleton className="h-8 w-32" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShellChrome({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const unreadCount = useUnreadCount();

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === 'true');
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} unreadCount={unreadCount} />

        <div className={cn('flex min-h-screen flex-col', collapsed ? 'lg:pl-16' : 'lg:pl-60')}>
          <MobileTopBar unreadCount={unreadCount} />

          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-20 pt-4 sm:px-6 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>

        <MobileTabBar
          onOpenMore={() => setMoreOpen(true)}
          moreOpen={moreOpen}
          unreadCount={unreadCount}
        />
        <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} unreadCount={unreadCount} />
      </div>
    </TooltipProvider>
  );
}

/**
 * Shell único de la app: sidebar en desktop, barra superior y pestañas en móvil.
 * Se monta una sola vez en el layout raíz y se aparta en `/login` y `/register`.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading } = useAuth();

  if (BARE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <ShellSkeleton />;
  }

  return (
    <ShellMetaProvider>
      <ShellChrome>{children}</ShellChrome>
    </ShellMetaProvider>
  );
}
