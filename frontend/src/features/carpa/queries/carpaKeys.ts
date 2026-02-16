export const carpaKeys = {
  all: ['carpa'] as const,
  dashboard: (sectionId: string) => [...carpaKeys.all, sectionId, 'dashboard'] as const,
  feedingPlans: (sectionId: string) => [...carpaKeys.all, sectionId, 'feeding-plans'] as const,
  preventionPlans: (sectionId: string) => [...carpaKeys.all, sectionId, 'prevention-plans'] as const,
  events: (sectionId: string, limit: number) => [...carpaKeys.all, sectionId, 'events', limit] as const,
  layout: (sectionId: string) => [...carpaKeys.all, sectionId, 'layout'] as const,
};
