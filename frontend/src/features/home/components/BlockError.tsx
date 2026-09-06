'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlockErrorProps {
  /** Qué falló, en concreto. */
  message: string;
  onRetry: () => void;
}

/** Banner de servicio caído dentro de un bloque: el resto de la página sigue viva. */
export function BlockError({ message, onRetry }: BlockErrorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-warn/30 bg-warn/10 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warn" />
      <p className="min-w-0 flex-1 text-sm text-warn">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
