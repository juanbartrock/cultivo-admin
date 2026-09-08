'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stageRangeService } from '@/services/stageRangeService';
import { RangeStage, StageRange, StageRangeValues } from '@/types';
import { rangosKeys } from '../queries/rangosKeys';

/**
 * Única fuente de los rangos de lecturas. Mientras la query no resolvió, `rangeFor` devuelve
 * `null` y el estado de toda lectura es `unknown`: sin rangos no hay color.
 */
export function useStageRanges() {
  const query = useQuery({
    queryKey: rangosKeys.list,
    queryFn: () => stageRangeService.getAll(),
    staleTime: 5 * 60_000,
  });

  const byStage = useMemo(() => {
    const map = new Map<RangeStage, StageRange>();
    for (const range of query.data ?? []) map.set(range.stage, range);
    return map;
  }, [query.data]);

  /** Rangos de una etapa; sin etapa o sin fila cae en DEFAULT. */
  const rangeFor = useCallback(
    (stage: RangeStage | null | undefined): StageRange | null =>
      byStage.get(stage ?? 'DEFAULT') ?? byStage.get('DEFAULT') ?? null,
    [byStage]
  );

  return {
    ranges: query.data ?? [],
    rangeFor,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

/** Guardado de una etapa: invalida la lista para que home y carpa repinten sin recargar. */
export function useUpdateStageRange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stage, values }: { stage: RangeStage; values: StageRangeValues }) =>
      stageRangeService.update(stage, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rangosKeys.all });
    },
  });
}
