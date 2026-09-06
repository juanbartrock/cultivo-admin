import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'panel' | 'metric' | 'interactive';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const cardVariantClasses: Record<CardVariant, string> = {
  panel: 'surface-card',
  metric: 'surface-card border-emerald-700/30',
  interactive:
    'surface-card transition-all hover:-translate-y-0.5 hover:border-emerald-500/35 hover:bg-zinc-700/25',
};

export function Card({ className, variant = 'panel', ...props }: CardProps) {
  return <div className={cn('rounded-2xl', cardVariantClasses[variant], className)} {...props} />;
}
