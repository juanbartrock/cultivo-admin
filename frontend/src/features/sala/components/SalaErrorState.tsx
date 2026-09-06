import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface SalaErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function SalaErrorState({ message, onRetry }: SalaErrorStateProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="mb-4 h-16 w-16 text-red-400" />
      <h1 className="mb-2 text-2xl font-bold text-white">Error de conexión</h1>
      <p className="mb-5 max-w-md text-zinc-400">{message}</p>
      <Button onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
