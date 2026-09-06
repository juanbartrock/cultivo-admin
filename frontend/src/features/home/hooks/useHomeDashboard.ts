'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDevicesStatus } from '@/hooks/useDeviceStatus';
import { cycleService } from '@/services/growService';
import { eventService } from '@/services/eventService';
import { sectionService } from '@/services/locationService';
import { CycleWithCount, Device, GrowEvent, Section } from '@/types';
import {
  ReadingStatus,
  SectionReadings,
  readingStatus,
  sectionReadings,
} from '../lib/readings';

export const homeKeys = {
  sections: ['home', 'sections'] as const,
  cycles: ['home', 'cycles', 'active'] as const,
  events: ['home', 'events', 'recent'] as const,
};

export interface SectionAlert {
  sectionId: string;
  sectionName: string;
  roomName?: string;
  label: string;
  detail: string;
  severity: Exclude<ReadingStatus, 'ok' | 'unknown'> | 'offline';
}

export interface SectionSummary {
  section: Section;
  readings: SectionReadings;
  /** Dispositivos controlables encendidos. */
  devicesOn: Device[];
  plantsCount: number;
  status: ReadingStatus;
}

export interface DeviceIssue {
  device: Device;
  sectionName?: string;
}

export function useHomeDashboard() {
  const sectionsQuery = useQuery({
    queryKey: homeKeys.sections,
    queryFn: () => sectionService.getAll(),
  });

  const cyclesQuery = useQuery({
    queryKey: homeKeys.cycles,
    queryFn: () => cycleService.getActive(),
  });

  const eventsQuery = useQuery({
    queryKey: homeKeys.events,
    queryFn: () => eventService.getAll({ limit: 50 }),
  });

  const sections = useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data]);

  const devices = useMemo<Device[]>(
    () => sections.flatMap((section) => section.devices ?? []),
    [sections]
  );

  const {
    getStatus,
    loading: statusLoading,
    refresh: refreshStatuses,
  } = useDevicesStatus(devices, { pollingInterval: 30_000, autoRefresh: true });

  const summaries = useMemo<SectionSummary[]>(
    () =>
      sections.map((section) => {
        const readings = sectionReadings(section, getStatus);
        const devicesOn = (section.devices ?? []).filter((device) => {
          if (device.type === 'SENSOR' || device.type === 'CAMARA') return false;
          const status = getStatus(device.id);
          return status?.state === 'on' || status?.switch === 'on' || status?.power === true;
        });

        const statuses = [
          readingStatus('temperature', readings.temperature),
          readingStatus('humidity', readings.humidity),
          readingStatus('vpd', readings.vpd),
        ];

        const status: ReadingStatus = statuses.includes('danger')
          ? 'danger'
          : statuses.includes('warn')
          ? 'warn'
          : statuses.includes('ok')
          ? 'ok'
          : 'unknown';

        return {
          section,
          readings,
          devicesOn,
          plantsCount: section._count?.plants ?? section.plants?.length ?? 0,
          status,
        };
      }),
    [getStatus, sections]
  );

  const alerts = useMemo<SectionAlert[]>(() => {
    const result: SectionAlert[] = [];

    for (const { section, readings } of summaries) {
      const checks: Array<{ label: string; detail: string; status: ReadingStatus }> = [
        {
          label: 'Temperatura',
          detail: readings.temperature !== null ? `${readings.temperature} °C` : '—',
          status: readingStatus('temperature', readings.temperature),
        },
        {
          label: 'Humedad',
          detail: readings.humidity !== null ? `${readings.humidity} %` : '—',
          status: readingStatus('humidity', readings.humidity),
        },
        {
          label: 'VPD',
          detail: readings.vpd !== null ? `${readings.vpd} kPa` : '—',
          status: readingStatus('vpd', readings.vpd),
        },
      ];

      for (const check of checks) {
        if (check.status === 'warn' || check.status === 'danger') {
          result.push({
            sectionId: section.id,
            sectionName: section.name,
            roomName: section.room?.name,
            label: check.label,
            detail: check.detail,
            severity: check.status,
          });
        }
      }
    }

    for (const section of sections) {
      for (const device of section.devices ?? []) {
        const status = getStatus(device.id);
        if (status && status.online === false) {
          result.push({
            sectionId: section.id,
            sectionName: section.name,
            roomName: section.room?.name,
            label: device.name,
            detail: 'Sin respuesta',
            severity: 'offline',
          });
        }
      }
    }

    const order = { danger: 0, warn: 1, offline: 2 } as const;
    return result.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [getStatus, sections, summaries]);

  const deviceIssues = useMemo<DeviceIssue[]>(() => {
    const issues: DeviceIssue[] = [];
    for (const section of sections) {
      for (const device of section.devices ?? []) {
        const status = getStatus(device.id);
        if (status && status.online === false) {
          issues.push({ device, sectionName: section.name });
        }
      }
    }
    return issues;
  }, [getStatus, sections]);

  const cycles = useMemo<CycleWithCount[]>(() => cyclesQuery.data ?? [], [cyclesQuery.data]);

  const lastEventByCycle = useMemo(() => {
    const map = new Map<string, GrowEvent>();
    for (const event of eventsQuery.data ?? []) {
      if (!event.cycleId || map.has(event.cycleId)) continue;
      map.set(event.cycleId, event);
    }
    return map;
  }, [eventsQuery.data]);

  return {
    summaries,
    alerts,
    deviceIssues,
    cycles,
    lastEventByCycle,
    statusLoading,
    refreshStatuses,
    sectionsQuery,
    cyclesQuery,
  };
}
