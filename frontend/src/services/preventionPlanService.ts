/**
 * Prevention Plan Service - Cliente para la API de planes de prevención
 */

import { api } from './apiService';
import {
  PreventionPlan,
  PreventionPlanWithCount,
  PreventionPlanApplication,
  ImportPreventionPlanDto,
  CreatePreventionPlanDto,
  AssignPreventionPlanDto,
  SectionPreventionPlansResponse,
  PlantPreventionPlan,
  PlantStage,
} from '@/types';

/**
 * Servicio de planes de prevención
 */
export const preventionPlanService = {
  // ============================================
  // PREVENTION PLANS
  // ============================================

  /**
   * Obtener todos los planes de prevención
   */
  getAll: async (stage?: PlantStage): Promise<PreventionPlanWithCount[]> => {
    const query = stage ? `?stage=${stage}` : '';
    return api.get<PreventionPlanWithCount[]>(`/prevention-plans${query}`);
  },

  /**
   * Obtener un plan por ID
   */
  getById: async (id: string): Promise<PreventionPlan> => {
    return api.get<PreventionPlan>(`/prevention-plans/${id}`);
  },

  /**
   * Crear un nuevo plan (vacío)
   */
  create: async (data: CreatePreventionPlanDto): Promise<PreventionPlan> => {
    return api.post<PreventionPlan>('/prevention-plans', data);
  },

  /**
   * Importar plan desde JSON (con aplicaciones)
   */
  import: async (data: ImportPreventionPlanDto): Promise<PreventionPlan> => {
    return api.post<PreventionPlan>('/prevention-plans/import', data);
  },

  /**
   * Actualizar un plan
   */
  update: async (
    id: string,
    data: Partial<CreatePreventionPlanDto>
  ): Promise<PreventionPlan> => {
    return api.put<PreventionPlan>(`/prevention-plans/${id}`, data);
  },

  /**
   * Eliminar un plan
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/prevention-plans/${id}`);
  },

  // ============================================
  // APPLICATIONS
  // ============================================

  /**
   * Agregar o actualizar aplicación en un plan
   */
  addOrUpdateApplication: async (
    planId: string,
    application: Omit<PreventionPlanApplication, 'id'>
  ): Promise<PreventionPlanApplication> => {
    return api.post<PreventionPlanApplication>(
      `/prevention-plans/${planId}/applications`,
      application
    );
  },

  /**
   * Eliminar aplicación de un plan
   */
  deleteApplication: async (planId: string, dayNumber: number): Promise<void> => {
    await api.delete(`/prevention-plans/${planId}/applications/${dayNumber}`);
  },

  // ============================================
  // PLANT ASSIGNMENTS
  // ============================================

  /**
   * Asignar plan a una planta
   */
  assignToPlant: async (
    plantId: string,
    data: AssignPreventionPlanDto
  ): Promise<PlantPreventionPlan> => {
    return api.post<PlantPreventionPlan>(`/plants/${plantId}/prevention-plan`, data);
  },

  /**
   * Desasignar plan de una planta
   */
  unassignFromPlant: async (
    plantId: string,
    preventionPlanId: string
  ): Promise<void> => {
    await api.delete(`/plants/${plantId}/prevention-plan/${preventionPlanId}`);
  },

  // ============================================
  // SECTION PREVENTION PLANS
  // ============================================

  /**
   * Obtener planes de prevención de una sección
   * Incluye día actual, anterior y siguiente para cada planta
   */
  getSectionPreventionPlans: async (
    sectionId: string
  ): Promise<SectionPreventionPlansResponse> => {
    return api.get<SectionPreventionPlansResponse>(
      `/sections/${sectionId}/prevention-plans`
    );
  },
};

export default preventionPlanService;
