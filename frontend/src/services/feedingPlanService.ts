/**
 * Feeding Plan Service - Cliente para la API de planes de alimentación
 */

import { api } from './apiService';
import {
  FeedingPlan,
  FeedingPlanWithCount,
  FeedingPlanWeek,
  ImportFeedingPlanDto,
  CreateFeedingPlanDto,
  AssignFeedingPlanDto,
  SectionFeedingPlansResponse,
  PlantFeedingPlan,
  PlantStage,
} from '@/types';

/**
 * Servicio de planes de alimentación
 */
export const feedingPlanService = {
  // ============================================
  // FEEDING PLANS
  // ============================================

  /**
   * Obtener todos los planes de alimentación
   */
  getAll: async (stage?: PlantStage): Promise<FeedingPlanWithCount[]> => {
    const query = stage ? `?stage=${stage}` : '';
    return api.get<FeedingPlanWithCount[]>(`/feeding-plans${query}`);
  },

  /**
   * Obtener un plan por ID
   */
  getById: async (id: string): Promise<FeedingPlan> => {
    return api.get<FeedingPlan>(`/feeding-plans/${id}`);
  },

  /**
   * Crear un nuevo plan (vacío)
   */
  create: async (data: CreateFeedingPlanDto): Promise<FeedingPlan> => {
    return api.post<FeedingPlan>('/feeding-plans', data);
  },

  /**
   * Importar plan desde JSON (con semanas)
   */
  import: async (data: ImportFeedingPlanDto): Promise<FeedingPlan> => {
    return api.post<FeedingPlan>('/feeding-plans/import', data);
  },

  /**
   * Actualizar un plan
   */
  update: async (
    id: string,
    data: Partial<CreateFeedingPlanDto>
  ): Promise<FeedingPlan> => {
    return api.put<FeedingPlan>(`/feeding-plans/${id}`, data);
  },

  /**
   * Eliminar un plan
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/feeding-plans/${id}`);
  },

  // ============================================
  // WEEKS
  // ============================================

  /**
   * Agregar o actualizar semana en un plan
   */
  addOrUpdateWeek: async (
    planId: string,
    week: Omit<FeedingPlanWeek, 'id'>
  ): Promise<FeedingPlanWeek> => {
    return api.post<FeedingPlanWeek>(`/feeding-plans/${planId}/weeks`, week);
  },

  /**
   * Eliminar semana de un plan
   */
  deleteWeek: async (planId: string, weekNumber: number): Promise<void> => {
    await api.delete(`/feeding-plans/${planId}/weeks/${weekNumber}`);
  },

  // ============================================
  // PLANT ASSIGNMENTS
  // ============================================

  /**
   * Asignar plan a una planta
   */
  assignToPlant: async (
    plantId: string,
    data: AssignFeedingPlanDto
  ): Promise<PlantFeedingPlan> => {
    return api.post<PlantFeedingPlan>(`/plants/${plantId}/feeding-plan`, data);
  },

  /**
   * Desasignar plan de una planta
   */
  unassignFromPlant: async (
    plantId: string,
    feedingPlanId: string
  ): Promise<void> => {
    await api.delete(`/plants/${plantId}/feeding-plan/${feedingPlanId}`);
  },

  // ============================================
  // SECTION FEEDING PLANS
  // ============================================

  /**
   * Obtener planes de alimentación de una sección
   * Incluye semana actual, anterior y siguiente para cada planta
   */
  getSectionFeedingPlans: async (
    sectionId: string
  ): Promise<SectionFeedingPlansResponse> => {
    return api.get<SectionFeedingPlansResponse>(
      `/sections/${sectionId}/feeding-plans`
    );
  },
};

export default feedingPlanService;
