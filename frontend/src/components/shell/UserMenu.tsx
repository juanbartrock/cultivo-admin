'use client';

import Link from 'next/link';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  /** En el sidebar colapsado solo se muestra el avatar. */
  compact?: boolean;
  className?: string;
}

function initial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || '';
  return source ? source[0].toUpperCase() : '·';
}

export function UserMenu({ compact = false, className }: UserMenuProps) {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          compact && 'justify-center px-0',
          className
        )}
        aria-label="Menú de usuario"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-edge-strong bg-surface-2 text-sm font-semibold text-fg">
          {initial(user?.name, user?.email)}
        </span>
        {!compact ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-fg">{user?.name || user?.email || '—'}</span>
            <span className="block truncate text-xs text-fg-faint">
              {user ? user.subscriptionTier : '—'}
            </span>
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-fg-faint">
          {user?.email || 'Sesión sin perfil'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/usuarios" className="cursor-pointer">
              <Shield className="h-4 w-4" />
              Usuarios
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className="cursor-pointer" onSelect={() => void signOut()}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
