/**
 * Grow Service - Servicio para gestionar el cultivo
 * 
 * Maneja las entidades relacionadas con el crecimiento:
 * - Strains (Genéticas): Variedades de plantas
 * - Cycles (Ciclos): Períodos de cultivo
 * - Plants (Plantas): Plantas individuales
 */

import { api } from './apiService';
import {
  Strain,
  Cycle,
  CycleWithCount,
  CycleWithSummary,
  Plant,
  CycleStatus,
  PlantStage,
  CreateStrainDto,
  CreateCycleDto,
  CreatePlantDto,
  UpdatePlantDto,
  PPFDReading,
  PlantPPFDResult,
} from '@/types';

// ============================================
// STRAIN SERVICE - Gestión de Genéticas
// ============================================

export const strainService = {
  /**
   * Lista todas las genéticas
   */
  getAll: () => api.get<Strain[]>('/strains'),

  /**
   * Obtiene una genética por ID
   */
  getById: (id: string) => api.get<Strain>(`/strains/${id}`),

  /**
   * Crea una nueva genética
   */
  create: (data: CreateStrainDto) => api.post<Strain>('/strains', data),

  /**
   * Actualiza una genética
   */
  update: (id: string, data: Partial<Strain>) =>
    api.put<Strain>(`/strains/${id}`, data),

  /**
   * Elimina una genética
   */
  delete: (id: string) => api.delete(`/strains/${id}`),
};

// ============================================
// CYCLE SERVICE - Gestión de Ciclos
// ============================================

export const cycleService = {
  /**
   * Lista todos los ciclos (incluye conteo de plantas/eventos)
   * @param status - Filtrar por estado (opcional)
   */
  getAll: (status?: CycleStatus) =>
    api.get<CycleWithCount[]>(`/cycles${status ? `?status=${status}` : ''}`),

  /**
   * Obtiene un ciclo por ID (incluye resumen)
   */
  getById: (id: string) => api.get<CycleWithSummary>(`/cycles/${id}`),

  /**
   * Crea un nuevo ciclo
   */
  create: (data: CreateCycleDto) => api.post<Cycle>('/cycles', data),

  /**
   * Actualiza un ciclo
   */
  update: (id: string, data: Partial<Cycle>) =>
    api.put<Cycle>(`/cycles/${id}`, data),

  /**
   * Marca un ciclo como completado
   */
  complete: (id: string) => api.post<Cycle>(`/cycles/${id}/complete`, {}),

  /**
   * Elimina un ciclo
   */
  delete: (id: string) => api.delete(`/cycles/${id}`),

  /**
   * Obtiene las plantas de un ciclo
   */
  getPlants: (id: string) => api.get<Plant[]>(`/cycles/${id}/plants`),

  /**
   * Obtiene los ciclos activos
   */
  getActive: () => api.get<CycleWithCount[]>('/cycles?status=ACTIVE'),

  /**
   * Obtiene los ciclos completados
   */
  getCompleted: () => api.get<CycleWithCount[]>('/cycles?status=COMPLETED'),
};

// ============================================
// PLANT SERVICE - Gestión de Plantas
// ============================================

export const plantService = {
  /**
   * Lista todas las plantas
   * @param filters - Filtros opcionales (cycleId, sectionId)
   */
  getAll: (filters?: { cycleId?: string; sectionId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.cycleId) params.set('cycleId', filters.cycleId);
    if (filters?.sectionId) params.set('sectionId', filters.sectionId);
    const query = params.toString();
    return api.get<Plant[]>(`/plants${query ? `?${query}` : ''}`);
  },

  /**
   * Obtiene una planta por ID
   */
  getById: (id: string) => api.get<Plant>(`/plants/${id}`),

  /**
   * Crea una nueva planta
   */
  create: (data: CreatePlantDto) => api.post<Plant>('/plants', data),

  /**
   * Actualiza una planta
   */
  update: (id: string, data: UpdatePlantDto) =>
    api.put<Plant>(`/plants/${id}`, data),

  /**
   * Mueve una planta (cambiar sección y/o etapa)
   * @param stageDate - Fecha opcional del cambio de etapa (formato YYYY-MM-DD)
   */
  move: (id: string, data: { sectionId?: string; zones?: Array<{ zone: number; coverage?: number }>; stage?: PlantStage; stageDate?: string }) =>
    api.patch<Plant>(`/plants/${id}/move`, data),

  /**
   * Obtiene el PPFD actual de las zonas asignadas a la planta (promedio ponderado)
   */
  getPPFD: (id: string) => api.get<PlantPPFDResult | null>(`/plants/${id}/ppfd`),

  /**
   * Elimina una planta
   */
  delete: (id: string) => api.delete(`/plants/${id}`),

  /**
   * Obtiene plantas por sección
   */
  getBySection: (sectionId: string) =>
    api.get<Plant[]>(`/plants?sectionId=${sectionId}`),

  /**
   * Obtiene plantas por ciclo
   */
  getByCycle: (cycleId: string) =>
    api.get<Plant[]>(`/plants?cycleId=${cycleId}`),
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Obtiene estadísticas generales del cultivo
 */
export async function getGrowStats(): Promise<{
  totalStrains: number;
  activeCycles: number;
  totalPlants: number;
  plantsByStage: Record<string, number>;
}> {
  try {
    const [strains, cycles, plants] = await Promise.all([
      strainService.getAll(),
      cycleService.getActive(),
      plantService.getAll(),
    ]);

    // Contar plantas por etapa
    const plantsByStage: Record<string, number> = {};
    plants.forEach(plant => {
      plantsByStage[plant.stage] = (plantsByStage[plant.stage] || 0) + 1;
    });

    return {
      totalStrains: strains.length,
      activeCycles: cycles.length,
      totalPlants: plants.length,
      plantsByStage,
    };
  } catch {
    return {
      totalStrains: 0,
      activeCycles: 0,
      totalPlants: 0,
      plantsByStage: {},
    };
  }
}

/**
 * Genera un código de tag único para una planta
 */
export function generatePlantTagCode(strainName: string, index: number): string {
  const prefix = strainName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

export default {
  strainService,
  cycleService,
  plantService,
  getGrowStats,
  generatePlantTagCode,
};
