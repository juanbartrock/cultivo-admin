/**
 * Harvest Service - Servicio para gestionar cosechas
 */

import { api } from './apiService';
import {
  Harvest,
  HarvestProduct,
  CreateHarvestDto,
  CreateHarvestProductDto,
  HarvestProductType,
  StorageLocation,
} from '@/types';

export interface HarvestStatistics {
  totalHarvests: number;
  totalWetWeight: number;
  totalDryWeight: number;
  totalTrimWeight: number;
  dryRatio: number;
  totalProducts: number;
  productsByType: Record<string, { count: number; totalWeight: number; currentWeight: number }>;
  productsByLocation: Record<string, { count: number; weight: number }>;
}

export const harvestService = {
  // ============================================
  // HARVESTS
  // ============================================

  /**
   * Lista todas las cosechas
   */
  getAll: (plantId?: string) => {
    const params = plantId ? `?plantId=${plantId}` : '';
    return api.get<Harvest[]>(`/harvests${params}`);
  },

  /**
   * Obtiene una cosecha por ID
   */
  getById: (id: string) => api.get<Harvest>(`/harvests/${id}`),

  /**
   * Crea una nueva cosecha
   */
  create: (data: CreateHarvestDto) => api.post<Harvest>('/harvests', data),

  /**
   * Actualiza una cosecha
   */
  update: (id: string, data: Partial<CreateHarvestDto>) =>
    api.put<Harvest>(`/harvests/${id}`, data),

  /**
   * Elimina una cosecha
   */
  delete: (id: string) => api.delete(`/harvests/${id}`),

  /**
   * Obtiene estadísticas de cosechas
   */
  getStatistics: (cycleId?: string) => {
    const params = cycleId ? `?cycleId=${cycleId}` : '';
    return api.get<HarvestStatistics>(`/harvests/statistics${params}`);
  },

  // ============================================
  // PRODUCTS
  // ============================================

  /**
   * Lista todos los productos
   */
  getAllProducts: (harvestId?: string, type?: HarvestProductType) => {
    const params = new URLSearchParams();
    if (harvestId) params.append('harvestId', harvestId);
    if (type) params.append('type', type);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<HarvestProduct[]>(`/harvests/products/all${query}`);
  },

  /**
   * Obtiene un producto por ID
   */
  getProductById: (id: string) =>
    api.get<HarvestProduct>(`/harvests/products/${id}`),

  /**
   * Crea un nuevo producto
   */
  createProduct: (data: CreateHarvestProductDto) =>
    api.post<HarvestProduct>('/harvests/products', data),

  /**
   * Actualiza un producto
   */
  updateProduct: (
    id: string,
    data: Partial<{
      type: HarvestProductType;
      currentWeight: number;
      packageType: string;
      packageNumber: string;
      storageLocation: StorageLocation;
      notes: string;
    }>,
  ) => api.put<HarvestProduct>(`/harvests/products/${id}`, data),

  /**
   * Extrae material de un producto
   */
  extractMaterial: (id: string, amount: number, notes?: string) =>
    api.patch<HarvestProduct>(`/harvests/products/${id}/extract`, {
      amount,
      notes,
    }),

  /**
   * Elimina un producto
   */
  deleteProduct: (id: string) => api.delete(`/harvests/products/${id}`),
};

export default harvestService;





