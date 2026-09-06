import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface SalaErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function SalaErrorState({ message, onRetry }: SalaErrorStateProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-warn/30 bg-warn/10 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warn" />
      <p className="min-w-0 flex-1 text-sm text-warn">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
