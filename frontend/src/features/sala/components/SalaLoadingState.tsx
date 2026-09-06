import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui';

export function SalaLoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="flex min-h-[35vh] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <Loader2 className="h-8 w-8 animate-spin text-cultivo-green-500" />
        <p className="text-sm text-zinc-400">Cargando sala de cultivo...</p>
      </div>
    </div>
  );
}
