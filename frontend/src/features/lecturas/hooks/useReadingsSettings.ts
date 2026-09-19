'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readingsSettingsService } from '@/services/readingsSettingsService';
import { useAuth } from '@/contexts/AuthContext';
import { lecturasKeys } from '../queries';

/**
 * Única fuente del interruptor general de lecturas. Mientras la query no resolvió el valor es
 * `true`: se conserva el comportamiento histórico y ninguna pantalla dice "desactivadas" por
 * una consulta en vuelo.
 */
export function useReadingsSettings() {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: lecturasKeys.settings,
    queryFn: () => readingsSettingsService.get(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  return {
    sensorsEnabled: query.data?.sensorsEnabled ?? true,
    updatedAt: query.data?.updatedAt ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

/** Guardado del interruptor: invalida la query para que home, sala y carpa repinten. */
export function useUpdateReadingsSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sensorsEnabled: boolean) => readingsSettingsService.update(sensorsEnabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lecturasKeys.all });
    },
  });
}
