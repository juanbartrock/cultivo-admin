'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agendaService } from '@/services/agendaService';
import { sectionService } from '@/services/locationService';
import { homeKeys } from '@/features/home/hooks/useHomeDashboard';
import { TaskInput, WateringInput } from '@/types';
import { hoyKeys } from '../queries/hoyKeys';

/** Se refresca cada 5 min: las lecturas entran cada ~4 min y los períodos avanzan solos. */
const REFRESH_MS = 5 * 60_000;

export function useAgendaHoy() {
  return useQuery({
    queryKey: hoyKeys.today,
    queryFn: () => agendaService.getToday(),
    refetchInterval: REFRESH_MS,
  });
}

/**
 * Escrituras del bloque "Hoy". Todas invalidan la agenda; las que escriben eventos también los
 * eventos recientes de Inicio, para que "Ciclos activos" muestre el último.
 */
export function useAgendaMutations() {
  const queryClient = useQueryClient();
  const refresh = (withEvents = false) => {
    void queryClient.invalidateQueries({ queryKey: hoyKeys.all });
    if (withEvents) void queryClient.invalidateQueries({ queryKey: homeKeys.events });
  };

  const createTask = useMutation({
    mutationFn: (data: TaskInput) => agendaService.createTask(data),
    onSuccess: () => refresh(),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof agendaService.updateTask>[1] }) =>
      agendaService.updateTask(id, data),
    onSuccess: () => refresh(),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => agendaService.deleteTask(id),
    onSuccess: () => refresh(),
  });

  const completeTask = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => agendaService.completeTask(id, note),
    onSuccess: () => refresh(true),
  });

  const completePrevention = useMutation({
    mutationFn: ({ sectionId, key, note }: { sectionId: string; key: string; note?: string }) =>
      agendaService.completePrevention(sectionId, key, note),
    onSuccess: () => refresh(true),
  });

  const registerWatering = useMutation({
    mutationFn: (data: WateringInput) => agendaService.registerWatering(data),
    onSuccess: () => refresh(true),
  });

  const updateLights = useMutation({
    mutationFn: ({ sectionId, lightsOn, lightsOff }: { sectionId: string; lightsOn: string | null; lightsOff: string | null }) =>
      sectionService.update(sectionId, { lightsOn, lightsOff }),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: homeKeys.sections });
    },
  });

  return { createTask, updateTask, deleteTask, completeTask, completePrevention, registerWatering, updateLights };
}
