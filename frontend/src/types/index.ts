// ============================================
// NUEVOS TIPOS - Alineados con Backend NestJS
// ============================================

// Conectores de dispositivos IoT
export type Connector = 'SONOFF' | 'TUYA' | 'TAPO';

// Tipos de dispositivos
export type DeviceType =
  | 'SENSOR'
  | 'LUZ'
  | 'EXTRACTOR'
  | 'VENTILADOR'
  | 'HUMIDIFICADOR'
  | 'DESHUMIDIFICADOR'
  | 'AIRE_ACONDICIONADO'
  | 'BOMBA_RIEGO'
  | 'CALEFACTOR'
  | 'CAMARA';

// Tipos de genéticas
export type StrainType = 'SATIVA' | 'INDICA' | 'RUDERALIS' | 'HYBRID';

// Estados del ciclo
export type CycleStatus = 'ACTIVE' | 'COMPLETED' | 'CURED';

// Etapas de la planta
export type PlantStage = 'GERMINACION' | 'VEGETATIVO' | 'PRE_FLORA' | 'FLORACION' | 'SECADO' | 'CURADO';

// Sexo de la planta
export type PlantSex = 'FEM' | 'REG' | 'AUTO' | 'UNKNOWN';

// Tipos de eventos
export type EventType =
  | 'RIEGO'
  | 'PODA'
  | 'CAMBIO_FOTOPERIODO'
  | 'TRANSPLANTE'
  | 'NOTA'
  | 'FOTO'
  | 'PARAMETRO_AMBIENTAL';

// ============================================
// INTERFACES DE ENTIDADES - Backend
// ============================================

// Sala
export interface Room {
  id: string;
  name: string;
  description?: string;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

// Sección/Carpa
export interface Section {
  id: string;
  name: string;
  dimensions?: string;
  image?: string;
  description?: string;
  roomId: string;
  room?: Room;
  devices: Device[];
  plants: Plant[];
  createdAt: string;
  updatedAt: string;
}

// Dashboard de sección (con resumen)
export interface SectionDashboard extends Section {
  summary: {
    totalPlants: number;
    totalDevices: number;
    plantsByStage: Record<string, number>;
  };
}

// Dispositivo
export interface Device {
  id: string;
  name: string;
  connector: Connector;
  externalId: string;
  type: DeviceType;
  sectionId?: string;
  section?: Section;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Estado de dispositivo en tiempo real
export interface DeviceStatus {
  online: boolean;
  state?: 'on' | 'off';
  temperature?: number;
  humidity?: number;
  [key: string]: unknown;
}

// Dispositivo detectado en escaneo (no persistido)
export interface ScannedDevice {
  id: string;           // ID externo del conector
  name: string;
  connector: Connector;
  online: boolean;
  category?: string;
  model?: string;
  brand?: string;
  ip?: string;
  isAssigned: boolean;  // Ya está en la DB
  assignedTo?: {
    sectionId: string;
    sectionName: string;
  };
}

// Genética
export interface Strain {
  id: string;
  name: string;
  breeder?: string;
  type: StrainType;
  floweringDaysExpected?: number;
  description?: string;
  plants?: Plant[];
  createdAt: string;
  updatedAt: string;
}

// Ciclo de cultivo
export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: CycleStatus;
  notes?: string;
  plants: Plant[];
  events: GrowEvent[];
  createdAt: string;
  updatedAt: string;
}

// Ciclo con resumen
export interface CycleWithSummary extends Cycle {
  summary: {
    totalPlants: number;
    totalEvents: number;
    plantsByStage: Record<string, number>;
  };
}

// Ciclo con conteo (respuesta del listado)
export interface CycleWithCount extends Omit<Cycle, 'plants' | 'events'> {
  _count: {
    plants: number;
    events: number;
  };
}

// Planta
export interface Plant {
  id: string;
  tagCode: string;
  strainId: string;
  strain?: Strain;
  cycleId: string;
  cycle?: Cycle;
  sectionId: string;
  section?: Section;
  stage: PlantStage;
  sex: PlantSex;
  photo?: string;
  notes?: string;
  startDate?: string; // Fecha de inicio (germinación/plantado)
  stageStartDate?: string; // Fecha del último cambio de etapa
  events?: GrowEvent[];
  createdAt: string;
  updatedAt: string;
}

// Evento de bitácora
export interface GrowEvent {
  id: string;
  type: EventType;
  plantId?: string;
  plant?: Plant;
  cycleId?: string;
  cycle?: Cycle;
  sectionId?: string;
  section?: Section;
  data: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// TIPOS DE APLICACIÓN Y OBJETIVO (Prevención)
// ============================================

export type ApplicationType = 'FOLIAR' | 'RIEGO' | 'PREVENTIVO';
export type PreventionTarget = 'HONGOS' | 'PLAGAS' | 'AMBOS' | 'PREVENTIVO';

// ============================================
// PLANES DE ALIMENTACIÓN
// ============================================

// Producto dentro de una semana del plan
export interface FeedingProduct {
  name: string;
  dose: string;
  unit: string;
}

// Semana del plan de alimentación
export interface FeedingPlanWeek {
  id?: string;
  weekNumber: number;
  products: FeedingProduct[];
  ph?: number;
  ec?: number;
  notes?: string;
}

// Plan de alimentación
export interface FeedingPlan {
  id: string;
  name: string;
  description?: string;
  stage: PlantStage;
  weeks: FeedingPlanWeek[];
  createdAt: string;
  updatedAt: string;
}

// Plan de alimentación con conteo de plantas
export interface FeedingPlanWithCount extends FeedingPlan {
  _count: {
    plants: number;
  };
}

// Asignación de plan a planta
export interface PlantFeedingPlan {
  id: string;
  feedingPlanId: string;
  feedingPlanName: string;
  stage: PlantStage;
  stageStartDate: string;
  currentWeek: number;
  totalWeeks: number;
  previousWeek: FeedingPlanWeek | null;
  currentWeekData: FeedingPlanWeek | null;
  nextWeek: FeedingPlanWeek | null;
}

// Planta con info de planes de alimentación (para vista de sección)
export interface PlantWithFeedingPlans {
  id: string;
  tagCode: string;
  strain: Strain;
  stage: PlantStage;
  feedingPlans: PlantFeedingPlan[];
}

// Respuesta del endpoint de planes por sección
export interface SectionFeedingPlansResponse {
  sectionId: string;
  sectionName: string;
  plants: PlantWithFeedingPlans[];
}

// ============================================
// DTOs - Para crear/actualizar entidades
// ============================================

export interface CreateSectionDto {
  name: string;
  dimensions?: string;
  image?: string;
  description?: string;
  roomId: string;
}

export interface AssignDeviceDto {
  connector: Connector;
  externalId: string;
  sectionId: string;
  name?: string;
  type?: DeviceType;
  metadata?: Record<string, unknown>;
}

export interface CreateStrainDto {
  name: string;
  breeder?: string;
  type: StrainType;
  floweringDaysExpected?: number;
  description?: string;
}

export interface CreateCycleDto {
  name: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface CreatePlantDto {
  tagCode: string;
  strainId: string;
  cycleId: string;
  sectionId: string;
  stage?: PlantStage;
  sex?: PlantSex;
  photo?: string;
  notes?: string;
  startDate?: string;
}

// DTOs de eventos
export interface BaseEventDto {
  plantId?: string;
  cycleId?: string;
  sectionId?: string;
}

export interface WaterEventDto extends BaseEventDto {
  ph?: number;
  ec?: number;
  waterTemperature?: number;
  liters?: number;
  nutrients?: { name: string; dose: string }[];
  notes?: string;
}

export interface NoteEventDto extends BaseEventDto {
  content: string;
  tags?: string[];
}

export interface EnvironmentEventDto extends BaseEventDto {
  temperature?: number;
  humidity?: number;
  co2?: number;
  lightIntensity?: number;
  notes?: string;
}

export interface PhotoEventDto extends BaseEventDto {
  caption?: string;
}

// DTOs de planes de alimentación
export interface ImportFeedingPlanDto {
  name: string;
  description?: string;
  stage: PlantStage;
  weeks: {
    weekNumber: number;
    products: FeedingProduct[];
    ph?: number;
    ec?: number;
    notes?: string;
  }[];
}

export interface CreateFeedingPlanDto {
  name: string;
  description?: string;
  stage: PlantStage;
}

export interface AssignFeedingPlanDto {
  feedingPlanId: string;
  stageStartDate: string;
}

// ============================================
// PLANES DE PREVENCIÓN (Hongos y Plagas)
// ============================================

// Producto dentro de una aplicación del plan
export interface PreventionProduct {
  name: string;
  dose: string;
  unit: string;
}

// Aplicación del plan de prevención
export interface PreventionPlanApplication {
  id?: string;
  dayNumber: number;
  products: PreventionProduct[];
  applicationType?: ApplicationType;
  target?: PreventionTarget;
  notes?: string;
}

// Plan de prevención
export interface PreventionPlan {
  id: string;
  name: string;
  description?: string;
  stage: PlantStage;
  totalDays: number;
  applications: PreventionPlanApplication[];
  createdAt: string;
  updatedAt: string;
}

// Plan de prevención con conteo de plantas
export interface PreventionPlanWithCount extends PreventionPlan {
  _count: {
    plants: number;
  };
}

// Asignación de plan de prevención a planta
export interface PlantPreventionPlan {
  id: string;
  preventionPlanId: string;
  preventionPlanName: string;
  stage: PlantStage;
  startDate: string;
  currentDay: number;
  totalDays: number;
  previousApplication: PreventionPlanApplication | null;
  currentApplication: PreventionPlanApplication | null;
  nextApplication: PreventionPlanApplication | null;
}

// Planta con info de planes de prevención (para vista de sección)
export interface PlantWithPreventionPlans {
  id: string;
  tagCode: string;
  strain: Strain;
  stage: PlantStage;
  preventionPlans: PlantPreventionPlan[];
}

// Respuesta del endpoint de planes de prevención por sección
export interface SectionPreventionPlansResponse {
  sectionId: string;
  sectionName: string;
  plants: PlantWithPreventionPlans[];
}

// DTOs de planes de prevención
export interface ImportPreventionPlanDto {
  name: string;
  description?: string;
  stage: PlantStage;
  totalDays: number;
  applications: {
    dayNumber: number;
    products: PreventionProduct[];
    applicationType?: ApplicationType;
    target?: PreventionTarget;
    notes?: string;
  }[];
}

export interface CreatePreventionPlanDto {
  name: string;
  description?: string;
  stage: PlantStage;
  totalDays: number;
}

export interface AssignPreventionPlanDto {
  preventionPlanId: string;
  startDate: string;
}

// ============================================
// TIPOS LEGACY - Mantener para compatibilidad
// ============================================

// Tipos de artefactos disponibles (legacy)
export type TipoArtefacto = 
  | 'sensor'
  | 'luz'
  | 'extractor'
  | 'ventilador'
  | 'humidificador'
  | 'deshumidificador'
  | 'aire_acondicionado'
  | 'bomba_riego'
  | 'calefactor'
  | 'camara';

// Estado de un artefacto (legacy)
export type EstadoArtefacto = 'encendido' | 'apagado' | 'error' | 'standby';

// Ubicación donde puede estar un artefacto (legacy)
export type TipoUbicacion = 'sala' | 'carpa' | 'invernadero';

// Conectores de dispositivos IoT disponibles (legacy)
export type TipoConector = 'sonoff' | 'tuya' | 'tapo';

/**
 * Dispositivo raw detectado desde un conector (legacy)
 * Representa un dispositivo físico antes de ser asignado a una ubicación
 */
export interface DispositivoConector {
  id: string;
  nombre: string;
  conector: TipoConector;
  online: boolean;
  categoria?: string;   // Tuya: category (ej: "sensor", "switch")
  modelo?: string;      // Modelo del dispositivo
  marca?: string;       // Marca (ej: Sonoff brand)
  ip?: string;          // IP del dispositivo (Tuya/Tapo)
}

// Etapa de crecimiento de una planta (legacy)
export type EtapaPlanta = 'germinacion' | 'vegetativo' | 'pre_flora' | 'floracion' | 'secado' | 'curado';

/**
 * Artefacto asignado a una ubicación (legacy)
 * Representa un dispositivo físico ya configurado en la sala/carpa
 */
export interface Artefacto {
  id: string;
  nombre: string;
  tipo: TipoArtefacto;
  estado: EstadoArtefacto;
  ubicacionTipo: TipoUbicacion;
  ubicacionId: string;
  valor?: number;
  unidad?: string;
  ultimaActualizacion: string;
  // Vinculación con dispositivo físico real
  dispositivoId?: string;   // ID del dispositivo en el conector
  conector?: TipoConector;  // De qué conector viene (sonoff/tuya/tapo)
}

// Carpa de cultivo (legacy)
export interface Carpa {
  id: string;
  nombre: string;
  dimensiones: string;
  imagen: string;
  descripcion?: string;
  artefactos: Artefacto[];
  plantas: Planta[];
}

// Registro de estado de una planta (legacy)
export interface RegistroPlanta {
  id: string;
  fecha: string;
  estado: string;
  comentario?: string;
  foto?: string;
}

// Plan de alimentación (legacy)
export interface PlanAlimentacion {
  semana: number;
  productos: {
    nombre: string;
    dosis: string;
  }[];
}

// Planta (legacy)
export interface Planta {
  id: string;
  nombre: string;
  genetica: string;
  etapa: EtapaPlanta;
  diasEnEtapa: number;
  fechaInicio: string;
  foto?: string;
  planAlimentacion: PlanAlimentacion[];
  registros: RegistroPlanta[];
}

// Sala de cultivo (legacy)
export interface SalaCultivo {
  id: string;
  nombre: string;
  temperatura: number;
  humedad: number;
  artefactos: Artefacto[];
  carpas: Carpa[];
}

/**
 * Para el formulario de alta/asignación de artefactos (legacy)
 */
export interface NuevoArtefacto {
  nombre: string;
  tipo: TipoArtefacto;
  ubicacionTipo: TipoUbicacion;
  ubicacionId: string;
  // Opcional: vinculación con dispositivo físico
  dispositivoId?: string;
  conector?: TipoConector;
}

// ============================================
// UTILIDADES DE CONVERSIÓN
// ============================================

/**
 * Convierte DeviceType del backend a TipoArtefacto legacy
 */
export function deviceTypeToTipoArtefacto(type: DeviceType): TipoArtefacto {
  const map: Record<DeviceType, TipoArtefacto> = {
    SENSOR: 'sensor',
    LUZ: 'luz',
    EXTRACTOR: 'extractor',
    VENTILADOR: 'ventilador',
    HUMIDIFICADOR: 'humidificador',
    DESHUMIDIFICADOR: 'deshumidificador',
    AIRE_ACONDICIONADO: 'aire_acondicionado',
    BOMBA_RIEGO: 'bomba_riego',
    CALEFACTOR: 'calefactor',
    CAMARA: 'camara',
  };
  return map[type];
}

/**
 * Convierte TipoArtefacto legacy a DeviceType del backend
 */
export function tipoArtefactoToDeviceType(tipo: TipoArtefacto): DeviceType {
  const map: Record<TipoArtefacto, DeviceType> = {
    sensor: 'SENSOR',
    luz: 'LUZ',
    extractor: 'EXTRACTOR',
    ventilador: 'VENTILADOR',
    humidificador: 'HUMIDIFICADOR',
    deshumidificador: 'DESHUMIDIFICADOR',
    aire_acondicionado: 'AIRE_ACONDICIONADO',
    bomba_riego: 'BOMBA_RIEGO',
    calefactor: 'CALEFACTOR',
    camara: 'CAMARA',
  };
  return map[tipo];
}

/**
 * Convierte Connector del backend a TipoConector legacy
 */
export function connectorToTipoConector(connector: Connector): TipoConector {
  return connector.toLowerCase() as TipoConector;
}

/**
 * Convierte TipoConector legacy a Connector del backend
 */
export function tipoConectorToConnector(tipo: TipoConector): Connector {
  return tipo.toUpperCase() as Connector;
}

/**
 * Convierte PlantStage del backend a EtapaPlanta legacy
 */
export function plantStageToEtapaPlanta(stage: PlantStage): EtapaPlanta {
  return stage.toLowerCase() as EtapaPlanta;
}

/**
 * Convierte EtapaPlanta legacy a PlantStage del backend
 */
export function etapaPlantaToPlantStage(etapa: EtapaPlanta): PlantStage {
  return etapa.toUpperCase() as PlantStage;
}
