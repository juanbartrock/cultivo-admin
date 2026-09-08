'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserMenu } from './UserMenu';
import { useShellMeta } from './ShellContext';
import { routeTitle } from './nav';

interface MobileTopBarProps {
  unreadCount: number;
}

export function MobileTopBar({ unreadCount }: MobileTopBarProps) {
  const pathname = usePathname();
  const { pageMeta } = useShellMeta();

  const title = pageMeta?.title ?? routeTitle(pathname);
  const backHref = pageMeta?.backHref;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-edge bg-surface px-3 lg:hidden">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Volver"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      ) : null}

      {/*
        El h1 del documento lo pone `PageHeader`, que en móvil queda oculto por CSS y sale del
        árbol de accesibilidad. Acá el título se anuncia como encabezado sin sumar otro <h1>.
      */}
      <p
        role="heading"
        aria-level={1}
        className="min-w-0 flex-1 truncate font-display text-base font-semibold text-fg"
      >
        {title}
      </p>

      <Link
        href="/notificaciones"
        aria-label={
          unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'
        }
        className={cn(
          'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg'
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-0 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-warn px-1 text-[10px] font-semibold tabular-nums text-accent-fg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Link>

      <UserMenu compact className="w-auto" />
    </header>
  );
}
