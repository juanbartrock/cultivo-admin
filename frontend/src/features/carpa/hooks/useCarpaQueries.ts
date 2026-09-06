import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { feedingPlanService } from '@/services/feedingPlanService';
import { sectionService } from '@/services/locationService';
import { preventionPlanService } from '@/services/preventionPlanService';
import { SectionLayoutConfig } from '@/types';
import { carpaKeys } from '../queries/carpaKeys';

export function useCarpaDashboardQuery(sectionId: string | null) {
  return useQuery({
    queryKey: sectionId ? carpaKeys.dashboard(sectionId) : [...carpaKeys.all, 'dashboard-none'],
    queryFn: () => sectionService.getDashboard(sectionId as string),
    enabled: Boolean(sectionId),
  });
}

export function useCarpaPlans(sectionId: string | null) {
  const feedingPlansQuery = useQuery({
    queryKey: sectionId ? carpaKeys.feedingPlans(sectionId) : [...carpaKeys.all, 'feeding-none'],
    queryFn: () => feedingPlanService.getSectionFeedingPlans(sectionId as string),
    enabled: Boolean(sectionId),
  });

  const preventionPlansQuery = useQuery({
    queryKey: sectionId ? carpaKeys.preventionPlans(sectionId) : [...carpaKeys.all, 'prevention-none'],
    queryFn: () => preventionPlanService.getSectionPreventionPlans(sectionId as string),
    enabled: Boolean(sectionId),
  });

  return {
    feedingPlansQuery,
    preventionPlansQuery,
    isLoading: feedingPlansQuery.isLoading || preventionPlansQuery.isLoading,
    isFetching: feedingPlansQuery.isFetching || preventionPlansQuery.isFetching,
  };
}

export function useCarpaEvents(sectionId: string | null, limit = 40) {
  return useQuery({
    queryKey: sectionId ? carpaKeys.events(sectionId, limit) : [...carpaKeys.all, 'events-none', limit],
    queryFn: () => eventService.getAll({ sectionId: sectionId as string, limit }),
    enabled: Boolean(sectionId),
  });
}

export function useCarpaLayoutConfig(sectionId: string | null) {
  const queryClient = useQueryClient();

  const layoutQuery = useQuery({
    queryKey: sectionId ? carpaKeys.layout(sectionId) : [...carpaKeys.all, 'layout-none'],
    queryFn: () => sectionService.getLayout(sectionId as string),
    enabled: Boolean(sectionId),
  });

  const updateLayoutMutation = useMutation({
    mutationFn: (config: SectionLayoutConfig) =>
      sectionService.updateLayout(sectionId as string, config),
    onSuccess: () => {
      if (!sectionId) return;
      queryClient.invalidateQueries({ queryKey: carpaKeys.layout(sectionId) });
      queryClient.invalidateQueries({ queryKey: carpaKeys.dashboard(sectionId) });
    },
  });

  return {
    layoutQuery,
    updateLayoutMutation,
  };
}
