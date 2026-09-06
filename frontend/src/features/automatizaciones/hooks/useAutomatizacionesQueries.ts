import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { automationService } from '@/services/automationService';
import { AutomationStatus, CreateAutomationDto } from '@/types';
import { automatizacionesKeys } from '../queries/automatizacionesKeys';

export function useAutomationsQuery(sectionId?: string) {
  return useQuery({
    queryKey: automatizacionesKeys.list(sectionId),
    queryFn: () => automationService.getAll(sectionId),
  });
}

export function useAutomationDetailQuery(automationId: string | null) {
  return useQuery({
    queryKey: automationId
      ? automatizacionesKeys.detail(automationId)
      : [...automatizacionesKeys.all, 'detail-none'],
    queryFn: () => automationService.getById(automationId as string),
    enabled: Boolean(automationId),
  });
}

export function useAutomationExecutionsQuery(
  automationId: string | null,
  options: { limit?: number; from?: string; to?: string } = {}
) {
  return useQuery({
    queryKey: automationId
      ? automatizacionesKeys.executions(automationId, options.limit)
      : [...automatizacionesKeys.all, 'executions-none'],
    queryFn: () => automationService.getExecutions(automationId as string, options),
    enabled: Boolean(automationId),
  });
}

export function useAutomationCapabilitiesQuery() {
  return useQuery({
    queryKey: automatizacionesKeys.capabilities(),
    queryFn: () => automationService.analyzeCapabilities(),
  });
}

export function useAutomationMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateAutomationDto) => automationService.create(payload),
    onSuccess: (automation) => {
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.list(automation.sectionId) });
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.list() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAutomationDto> }) =>
      automationService.update(id, payload),
    onSuccess: (automation) => {
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.detail(automation.id) });
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.list(automation.sectionId) });
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.list() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; sectionId?: string }) => automationService.delete(id),
    onSuccess: (_, variables) => {
      if (variables.sectionId) {
        queryClient.invalidateQueries({ queryKey: automatizacionesKeys.list(variables.sectionId) });
      }
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.list() });
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AutomationStatus }) =>
      automationService.setStatus(id, status),
    onSuccess: (automation) => {
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.detail(automation.id) });
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.list(automation.sectionId) });
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.list() });
    },
  });

  const executeMutation = useMutation({
    mutationFn: ({ id, skipConditions }: { id: string; skipConditions?: boolean }) =>
      automationService.execute(id, Boolean(skipConditions)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: automatizacionesKeys.executions(variables.id) });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    setStatusMutation,
    executeMutation,
  };
}
