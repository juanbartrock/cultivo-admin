/**
 * Readings Settings Service - Interruptor general de lecturas de sensores.
 *
 * El GET lo lee cualquier usuario autenticado; el PUT exige rol ADMIN en el backend.
 */

import { api } from './apiService';
import { ReadingsSettings } from '@/types';

export const readingsSettingsService = {
  /** Estado del interruptor general. */
  get: () => api.get<ReadingsSettings>('/readings-settings'),

  /** Activa o desactiva las lecturas de sensores (solo admin). */
  update: (sensorsEnabled: boolean) =>
    api.put<ReadingsSettings>('/readings-settings', { sensorsEnabled }),
};

export default readingsSettingsService;
