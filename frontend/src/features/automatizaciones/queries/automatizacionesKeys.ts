export const automatizacionesKeys = {
  all: ['automatizaciones'] as const,
  list: (sectionId?: string) => [...automatizacionesKeys.all, 'list', sectionId ?? 'all'] as const,
  detail: (automationId: string) => [...automatizacionesKeys.all, 'detail', automationId] as const,
  executions: (automationId: string, limit?: number) =>
    [...automatizacionesKeys.all, 'executions', automationId, limit ?? 20] as const,
  capabilities: () => [...automatizacionesKeys.all, 'capabilities'] as const,
};
