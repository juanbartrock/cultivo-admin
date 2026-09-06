'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { MORE_ROUTES, NAV_ITEMS, isActiveRoute } from './nav';

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCount: number;
}

export function MoreSheet({ open, onOpenChange, unreadCount }: MoreSheetProps) {
  const pathname = usePathname();
  const { isAdmin, signOut } = useAuth();

  const items = NAV_ITEMS.filter(
    (item) => MORE_ROUTES.includes(item.href) && (!item.adminOnly || isAdmin)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-lg border-t border-edge p-0">
        <SheetHeader className="border-b border-edge px-4 py-3 text-left">
          <SheetTitle className="font-display text-base font-semibold text-fg">Más</SheetTitle>
        </SheetHeader>

        <nav className="p-2">
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(pathname, item.href);
              const badge = item.showsUnread && unreadCount > 0 ? unreadCount : null;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors',
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {badge !== null ? (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warn px-1 text-xs font-semibold tabular-nums text-accent-fg">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}

            <li>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  void signOut();
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Cerrar sesión</span>
              </button>
            </li>
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
