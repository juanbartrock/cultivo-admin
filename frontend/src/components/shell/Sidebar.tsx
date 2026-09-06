'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NAV_ITEMS, isActiveRoute } from './nav';
import { UserMenu } from './UserMenu';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  unreadCount: number;
}

export function Sidebar({ collapsed, onToggle, unreadCount }: SidebarProps) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-edge bg-surface lg:flex',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center gap-2 border-b border-edge px-3',
          collapsed && 'justify-center px-0'
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-edge bg-surface-2">
          <Leaf className="h-4 w-4 text-accent" />
        </span>
        {!collapsed ? (
          <span className="font-display text-sm font-semibold tracking-tight text-fg">Cultivo</span>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {items.map((item, index) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);
            const showSeparator = item.adminOnly && !items[index - 1]?.adminOnly;
            const badge = item.showsUnread && unreadCount > 0 ? unreadCount : null;

            const link = (
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
                {badge !== null ? (
                  <span
                    className={cn(
                      'flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warn px-1 text-xs font-semibold tabular-nums text-accent-fg',
                      collapsed && 'absolute right-1 top-1 h-4 min-w-[16px] px-0.5 text-[10px]'
                    )}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </Link>
            );

            return (
              <li key={item.href}>
                {showSeparator ? <Separator className="my-2 bg-edge" /> : null}
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-edge p-2">
        <UserMenu compact={collapsed} />
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir el menú' : 'Colapsar el menú'}
          className={cn(
            'mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" />
          ) : (
            <PanelLeftClose className="h-5 w-5 shrink-0" />
          )}
          {!collapsed ? <span>Colapsar</span> : null}
        </button>
      </div>
    </aside>
  );
}
