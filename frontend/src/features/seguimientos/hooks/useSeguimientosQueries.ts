import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cycleService, plantService } from '@/services/growService';
import { eventService, EventFilters } from '@/services/eventService';
import {
  CreateCycleDto,
  CreatePlantDto,
  CycleStatus,
  PaginationState,
  Plant,
  PlantStage,
} from '@/types';
import { seguimientosKeys } from '../queries/seguimientosKeys';

export function useCyclesQuery(status?: CycleStatus) {
  return useQuery({
    queryKey: seguimientosKeys.cycles(status),
    queryFn: () => cycleService.getAll(status),
  });
}

export function useCyclePlantsQuery(cycleId: string | null) {
  return useQuery({
    queryKey: cycleId ? seguimientosKeys.plants(cycleId) : [...seguimientosKeys.all, 'plants-none'],
    queryFn: () => plantService.getAll({ cycleId: cycleId as string }),
    enabled: Boolean(cycleId),
  });
}

function serializeEventFilters(filters: Omit<EventFilters, 'cycleId'> = {}) {
  return JSON.stringify({
    plantId: filters.plantId ?? null,
    type: filters.type ?? null,
    limit: filters.limit ?? null,
    offset: filters.offset ?? 0,
  });
}

export function useCycleEventsQuery(cycleId: string | null, filters: Omit<EventFilters, 'cycleId'> = {}) {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const query = useQuery({
    queryKey: cycleId
      ? seguimientosKeys.events(cycleId, serializeEventFilters(filters))
      : [...seguimientosKeys.all, 'events-none'],
    queryFn: () =>
      eventService.getAll({
        ...filters,
        cycleId: cycleId as string,
      }),
    enabled: Boolean(cycleId),
  });

  const total = query.data?.length ?? 0;
  const page = Math.floor(offset / limit) + 1;

  const pagination: PaginationState = {
    page,
    pageSize: limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };

  return {
    ...query,
    pagination,
  };
}

interface CycleMutationPayload {
  cycleId: string;
  status: CycleStatus;
}

interface PlantMovePayload {
  plantId: string;
  sectionId?: string;
  stage?: PlantStage;
}

export function useCycleMutations() {
  const queryClient = useQueryClient();

  const createCycleMutation = useMutation({
    mutationFn: (payload: CreateCycleDto) => cycleService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seguimientosKeys.all });
    },
  });

  const updateCycleStatusMutation = useMutation({
    mutationFn: ({ cycleId, status }: CycleMutationPayload) =>
      status === 'COMPLETED' || status === 'CURED'
        ? cycleService.complete(cycleId)
        : cycleService.update(cycleId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seguimientosKeys.all });
    },
  });

  const createPlantMutation = useMutation({
    mutationFn: (payload: CreatePlantDto) => plantService.create(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: seguimientosKeys.plants(variables.cycleId) });
      queryClient.invalidateQueries({ queryKey: seguimientosKeys.cycles() });
    },
  });

  const movePlantMutation = useMutation({
    mutationFn: ({ plantId, ...payload }: PlantMovePayload) => plantService.move(plantId, payload),
    onSuccess: (updatedPlant: Plant) => {
      queryClient.invalidateQueries({ queryKey: seguimientosKeys.plants(updatedPlant.cycleId) });
      queryClient.invalidateQueries({
        queryKey: [...seguimientosKeys.all, 'cycles', updatedPlant.cycleId, 'events'],
      });
    },
  });

  return {
    createCycleMutation,
    updateCycleStatusMutation,
    createPlantMutation,
    movePlantMutation,
  };
}
