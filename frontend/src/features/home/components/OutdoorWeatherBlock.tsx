'use client';

import { Droplets, Thermometer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeather } from '@/hooks/useWeather';
import { formatReading } from '../lib/readings';

export function OutdoorWeatherBlock() {
  const weather = useWeather('Buenos Aires');

  if (weather.loading) {
    return <Skeleton className="h-[74px] w-full" />;
  }

  if (weather.error) {
    return (
      <div className="rounded-md border border-edge bg-surface px-4 py-3 text-sm text-fg-faint">
        Clima no disponible
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-edge bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-fg">{weather.city}</p>
        <p className="truncate text-xs text-fg-faint">{weather.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Thermometer className="h-4 w-4 text-fg-faint" />
        <span className="font-display text-xl font-semibold tabular-nums text-fg">
          {formatReading(weather.temperature, ' °C')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Droplets className="h-4 w-4 text-fg-faint" />
        <span className="font-display text-xl font-semibold tabular-nums text-fg">
          {formatReading(weather.humidity, ' %', 0)}
        </span>
      </div>
    </div>
  );
}
