'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOBILE_TABS, MORE_ROUTES, NAV_ITEMS, isActiveRoute } from './nav';

interface MobileTabBarProps {
  onOpenMore: () => void;
  moreOpen: boolean;
  unreadCount: number;
}

export function MobileTabBar({ onOpenMore, moreOpen, unreadCount }: MobileTabBarProps) {
  const pathname = usePathname();
  const tabs = MOBILE_TABS.map((href) => NAV_ITEMS.find((item) => item.href === href)!).filter(
    Boolean
  );
  const moreActive =
    moreOpen || MORE_ROUTES.some((href) => isActiveRoute(pathname, href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-edge bg-surface lg:hidden">
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = isActiveRoute(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] transition-colors',
              active ? 'text-accent' : 'text-fg-muted'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="w-full truncate text-center">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        className={cn(
          'relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] transition-colors',
          moreActive ? 'text-accent' : 'text-fg-muted'
        )}
      >
        <MoreHorizontal className="h-5 w-5 shrink-0" />
        <span className="w-full truncate text-center">Más</span>
        {unreadCount > 0 ? (
          <span className="absolute right-[22%] top-1 h-2 w-2 rounded-full bg-warn" />
        ) : null}
      </button>
    </nav>
  );
}
