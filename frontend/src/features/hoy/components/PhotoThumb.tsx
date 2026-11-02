'use client';

import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { deviceService } from '@/services/deviceService';
import { formatWhen } from '../lib/format';

interface PhotoThumbProps {
  deviceId: string;
  filename: string;
  takenAt: string;
  today: string;
  timeZone: string;
}

/** Última foto de la cámara de la carpa. El backend la trae del tapo-service con el token. */
export function PhotoThumb({ deviceId, filename, takenAt, today, timeZone }: PhotoThumbProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    deviceService
      .getSnapshotImage(deviceId, filename)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [deviceId, filename]);

  const caption = `Foto ${formatWhen(takenAt, today, timeZone)}`;

  if (failed) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-fg-faint">
        <Camera className="h-3.5 w-3.5" />
        {caption} · sin respuesta de la cámara
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!url}
        className="group block w-full overflow-hidden rounded-md border border-edge text-left transition-colors hover:border-edge-strong"
        aria-label={`Ampliar ${caption}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob local, sin optimización de Next
          <img src={url} alt={caption} className="aspect-video w-full object-cover" />
        ) : (
          <Skeleton className="aspect-video w-full rounded-none" />
        )}
        <span className="flex items-center gap-1.5 bg-surface-2 px-3 py-1.5 text-xs text-fg-muted">
          <Camera className="h-3.5 w-3.5" />
          {caption}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-4xl gap-2 p-3" aria-describedby={undefined}>
          <DialogTitle className="text-sm text-fg-muted">{caption}</DialogTitle>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob local, sin optimización de Next
            <img src={url} alt={caption} className="w-full rounded-md" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
