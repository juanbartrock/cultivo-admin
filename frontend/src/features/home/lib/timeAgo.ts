'use client';

import { useEffect, useState } from 'react';

/** Antigüedad en lenguaje corto: `hace 12 s`, `hace 3 min`, `hace 2 h`. */
export function formatTimeAgo(date: Date, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

/** Antigüedad que se refresca sola mientras el componente está montado. */
export function useTimeAgo(date: Date | null | undefined, intervalMs = 5000): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!date) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [date, intervalMs]);

  return date ? formatTimeAgo(date, now) : null;
}
