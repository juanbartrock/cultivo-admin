/**
 * Automation Service - Servicio para gestionar automatizaciones
 */

import { api } from './apiService';
import {
  Automation,
  CreateAutomationDto,
  AutomationStatus,
  AutomationExecution,
} from '@/types';

export interface EffectivenessStats {
  period: string;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  totalEffectivenessChecks: number;
  checksWithGoalMet: number;
  effectivenessRate: number;
}

export interface EvaluationResult {
  allMet: boolean;
  results: Array<{
    conditionId: string;
    deviceId: string;
    property: string;
    operator: string;
    expectedValue: number;
    actualValue: number | null;
    met: boolean;
  }>;
}

export interface ExecutionResult {
  executionId: string;
  success: boolean;
  results: Array<{
    actionId: string;
    deviceId: string;
    actionType: string;
    success: boolean;
    error?: string;
  }>;
}

export const automationService = {
  /**
   * Lista todas las automatizaciones
   */
  getAll: (sectionId?: string) => {
    const params = sectionId ? `?sectionId=${sectionId}` : '';
    return api.get<Automation[]>(`/automations${params}`);
  },

  /**
   * Obtiene una automatización por ID
   */
  getById: (id: string) => api.get<Automation>(`/automations/${id}`),

  /**
   * Crea una nueva automatización
   */
  create: (data: CreateAutomationDto) =>
    api.post<Automation>('/automations', data),

  /**
   * Actualiza una automatización
   */
  update: (id: string, data: Partial<CreateAutomationDto>) =>
    api.put<Automation>(`/automations/${id}`, data),

  /**
   * Elimina una automatización
   */
  delete: (id: string) => api.delete(`/automations/${id}`),

  /**
   * Cambia el estado de una automatización
   */
  setStatus: (id: string, status: AutomationStatus) =>
    api.patch<Automation>(`/automations/${id}/status`, { status }),

  /**
   * Evalúa las condiciones de una automatización
   */
  evaluate: (id: string) =>
    api.get<EvaluationResult>(`/automations/${id}/evaluate`),

  /**
   * Ejecuta una automatización manualmente
   */
  execute: (id: string, skipConditions = false) =>
    api.post<ExecutionResult>(`/automations/${id}/execute`, { skipConditions }),

  /**
   * Obtiene el historial de ejecuciones
   */
  getExecutions: (id: string, options?: { limit?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<AutomationExecution[]>(`/automations/${id}/executions${query}`);
  },

  /**
   * Obtiene estadísticas de efectividad
   */
  getEffectiveness: (id: string, days = 30) =>
    api.get<EffectivenessStats>(`/automations/${id}/effectiveness?days=${days}`),
};

export default automationService;




