'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useRegisterPageMeta } from './ShellContext';

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Jerarquía en desktop; en móvil el shell usa el último tramo con href como "atrás". */
  breadcrumb?: Crumb[];
  actions?: ReactNode;
  className?: string;
}

/**
 * Encabezado de página del shell: título, subtítulo, breadcrumb y acciones.
 * En móvil el título lo muestra la barra superior, así que acá solo quedan las acciones.
 */
export function PageHeader({ title, subtitle, breadcrumb, actions, className }: PageHeaderProps) {
  const backHref = [...(breadcrumb ?? [])].reverse().find((crumb) => crumb.href)?.href;
  useRegisterPageMeta(title, backHref);

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="hidden min-w-0 lg:block">
        {breadcrumb?.length ? (
          <nav aria-label="Ruta" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-fg-faint">
            {breadcrumb.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="truncate transition-colors hover:text-fg">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="truncate">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <h1 className="font-display truncate text-2xl font-semibold tracking-tight text-fg">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-fg-muted">{subtitle}</p> : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
