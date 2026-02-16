export const seguimientosKeys = {
  all: ['seguimientos'] as const,
  cycles: (status?: string) => [...seguimientosKeys.all, 'cycles', status ?? 'all'] as const,
  plants: (cycleId: string) => [...seguimientosKeys.all, 'cycles', cycleId, 'plants'] as const,
  events: (cycleId: string, filtersKey: string) =>
    [...seguimientosKeys.all, 'cycles', cycleId, 'events', filtersKey] as const,
};
