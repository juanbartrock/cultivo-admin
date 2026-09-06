'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HomeSectionProps {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function HomeSection({ title, meta, actions, children, className }: HomeSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-fg-muted">
          {title}
        </h2>
        <div className="flex items-center gap-2 text-xs text-fg-faint">
          {meta}
          {actions}
        </div>
      </div>
      {children}
    </section>
  );
}
