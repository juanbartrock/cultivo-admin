'use client';

import { LucideIcon } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** Estado vacío del sistema: ícono de 24 px, un título y una acción. Sin ilustraciones. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-md border border-edge bg-surface px-4 py-10 text-center',
        className
      )}
    >
      <Icon className="h-6 w-6 text-fg-faint" strokeWidth={1.5} />
      <p className="text-sm font-medium text-fg">{title}</p>
      {description ? <p className="max-w-sm text-xs text-fg-muted">{description}</p> : null}
      {children}
      {actionLabel && onAction ? (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
