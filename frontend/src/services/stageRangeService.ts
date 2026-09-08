/**
 * Stage Range Service - Rangos de lecturas ambientales por etapa
 *
 * Única fuente de los umbrales ok/warn/danger. El GET lo puede leer cualquier usuario
 * autenticado; el PUT y el PATCH exigen rol ADMIN en el backend.
 */

import { api } from './apiService';
import { RangeStage, StageRange, StageRangeValues } from '@/types';

export const stageRangeService = {
  /** Las 7 filas: DEFAULT y una por etapa. */
  getAll: () => api.get<StageRange[]>('/stage-ranges'),

  /** Reemplaza los 16 valores de una etapa (solo admin). */
  update: (stage: RangeStage, values: StageRangeValues) =>
    api.put<StageRange>(`/stage-ranges/${stage}`, values),

  /** Actualiza parte de los valores de una etapa (solo admin). */
  patch: (stage: RangeStage, values: Partial<StageRangeValues>) =>
    api.patch<StageRange>(`/stage-ranges/${stage}`, values),
};

export default stageRangeService;
