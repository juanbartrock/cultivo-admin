import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

const badgeVariants: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'border border-zinc-700/70 bg-zinc-800/80 text-zinc-300',
  success: 'border border-cultivo-green-500/40 bg-cultivo-green-500/20 text-cultivo-green-300',
  warning: 'border border-amber-500/40 bg-amber-500/20 text-amber-300',
  danger: 'border border-red-500/40 bg-red-500/20 text-red-300',
  info: 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300',
};

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
