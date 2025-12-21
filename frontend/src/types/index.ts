// ============================================
// NUEVOS TIPOS - Alineados con Backend NestJS
// ============================================

// Conectores de dispositivos IoT
export type Connector = 'SONOFF' | 'TUYA' | 'TAPO' | 'ESP32' | 'VIRTUAL';

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

// Estado de salud de la planta
export type PlantHealthStatus = 'HEALTHY' | 'INFECTED' | 'DEAD';

// Tipos de eventos
export type EventType =
  | 'RIEGO'
  | 'PODA'
  | 'TRANSPLANTE'
  | 'CAMBIO_MACETA'
  | 'NOTA'
  | 'FOTO'
  | 'PARAMETRO_AMBIENTAL'
  | 'CAMBIO_FOTOPERIODO'
  | 'AI_ANALYSIS';

// Tipo de análisis IA
export type AnalysisType = 'NUTRICION' | 'PREVENCION' | 'VEGETATIVO' | 'FLORACION' | 'GENERAL';



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
  enabled?: boolean; // Si la sección está activa/en uso (default: true)
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
  recordHistory?: boolean; // Si registra historial (solo sensores)
  // Dependencia: dispositivo que controla a este
  controlledByDeviceId?: string;
  controlledBy?: Device; // Ej: Sonoff que controla al extractor
  controlledDevices?: Device[]; // Dispositivos que este controla
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
  zones?: PlantZone[]; // Zonas asignadas a la planta
  stage: PlantStage;
  sex: PlantSex;
  healthStatus?: PlantHealthStatus; // Estado de salud
  potSizeFinal?: string; // Tamaño de maceta final (ej: "11L", "25L")
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
  controlledByDeviceId?: string; // ID del dispositivo que controla a este
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
  zones?: PlantZoneDto[];
  stage?: PlantStage;
  sex?: PlantSex;
  healthStatus?: PlantHealthStatus;
  potSizeFinal?: string;
  photo?: string;
  notes?: string;
  startDate?: string;
}

export type UpdatePlantDto = Partial<CreatePlantDto>;

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

// ============================================
// AUTOMATIZACIONES
// ============================================

export type AutomationStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'PENDING_APPROVAL';
export type ConditionOperator = 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'NOT_EQUALS' | 'BETWEEN' | 'OUTSIDE';
export type ActionType = 'TURN_ON' | 'TURN_OFF' | 'TOGGLE' | 'CAPTURE_PHOTO' | 'TRIGGER_IRRIGATION' | 'AI_PLANT_ANALYSIS';
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type TriggerType = 'SCHEDULED' | 'CONDITION' | 'HYBRID';
export type ScheduleType = 'TIME_RANGE' | 'INTERVAL' | 'SPECIFIC_TIMES';

export interface AutomationCondition {
  id: string;
  automationId: string;
  deviceId?: string;
  device?: Device;
  property: string;
  operator: ConditionOperator;
  value: number;
  valueMax?: number;
  timeValue?: string;
  timeValueMax?: string;
  logicOperator: string;
  order: number;
}

export interface AutomationAction {
  id: string;
  automationId: string;
  deviceId: string;
  device?: Device;
  actionType: ActionType;
  duration?: number;
  delayMinutes?: number;
  value?: number;
  order: number;
}

export interface EffectivenessCheck {
  id: string;
  executionId: string;
  conditionMet: boolean;
  valueAtCheck?: number;
  targetValue?: number;
  notes?: string;
  checkedAt: string;
}

export interface AutomationExecution {
  id: string;
  automationId: string;
  status: ExecutionStatus;
  triggeredConditions?: unknown;
  executedActions?: unknown;
  errorMessage?: string;
  startedAt: string;
  endedAt?: string;
  effectivenessChecks?: EffectivenessCheck[];
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  sectionId: string;
  section?: Section;
  status: AutomationStatus;

  // Tipo de trigger
  triggerType: TriggerType;

  // Configuración de programación
  scheduleType?: ScheduleType;
  activeStartTime?: string;
  activeEndTime?: string;
  intervalMinutes?: number;
  actionDuration?: number;
  specificTimes: string[];

  // Campos existentes (mantener compatibilidad)
  interval: number; // Intervalo de evaluación en minutos
  executionTime?: number;
  daysOfWeek: number[];
  startTime?: string;
  endTime?: string;

  priority: number;
  allowOverlap: boolean;
  notifications: boolean;
  plantIds: string[]; // IDs de plantas asociadas (para automatizaciones de fotos)
  
  // Configuración de análisis IA (solo para AI_PLANT_ANALYSIS)
  analysisType?: AnalysisType;
  analysisIncludePhotos?: boolean;
  analysisIncludeFeedingPlans?: boolean;
  analysisIncludePreventionPlans?: boolean;
  analysisIncludeEvents?: boolean;
  analysisCustomPrompt?: string;
  
  dependsOnId?: string;
  dependsOn?: Automation;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  executions?: AutomationExecution[];
  lastEvaluatedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    executions: number;
  };
  
  // Campos de propuesta de IA
  proposedByAI?: boolean;
  aiReason?: string;
  aiConfidence?: number;
  aiContextSnapshot?: Record<string, unknown>;
  proposedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface CreateAutomationDto {
  name: string;
  description?: string;
  sectionId: string;

  // Tipo de trigger
  triggerType?: TriggerType;

  // Configuración de programación
  scheduleType?: ScheduleType;
  activeStartTime?: string;
  activeEndTime?: string;
  intervalMinutes?: number;
  actionDuration?: number;
  specificTimes?: string[];

  // Días y ventana de evaluación
  daysOfWeek?: number[];
  evaluationInterval?: number;
  startTime?: string;
  endTime?: string;

  priority?: number;
  allowOverlap?: boolean;
  notifications?: boolean;
  plantIds?: string[]; // IDs de plantas para registrar eventos (ej: para fotos)
  
  // Configuración de análisis IA (solo para AI_PLANT_ANALYSIS)
  analysisType?: AnalysisType;
  analysisIncludePhotos?: boolean;
  analysisIncludeFeedingPlans?: boolean;
  analysisIncludePreventionPlans?: boolean;
  analysisIncludeEvents?: boolean;
  analysisCustomPrompt?: string;
  
  dependsOnId?: string;

  // Condiciones (opcionales para SCHEDULED)
  conditions?: {
    deviceId: string;
    property: string;
    operator: ConditionOperator;
    value?: number;
    valueMax?: number;
    timeValue?: string;
    timeValueMax?: string;
    logicOperator?: string;
    order?: number;
  }[];

  actions: {
    deviceId?: string; // Opcional para AI_PLANT_ANALYSIS
    actionType: ActionType;
    duration?: number;
    delayMinutes?: number;
    value?: number;
    order?: number;
  }[];
}

// ============================================
// NOTIFICACIONES
// ============================================

export type NotificationType = 'AUTOMATION' | 'FEEDING_PLAN' | 'PREVENTION_PLAN' | 'MILESTONE' | 'ALERT' | 'SYSTEM' | 'WEATHER';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// PLANT ZONES
// ============================================

export interface PlantZone {
  id: string;
  plantId: string;
  zone: number; // Zona 1-6 dentro de la sección (grilla 2x3)
  coverage: number; // Porcentaje de ocupación de la zona (0-100)
  createdAt: string;
}

export interface PlantZoneDto {
  zone: number; // Zona 1-6 dentro de la sección (grilla 2x3)
  coverage?: number; // Porcentaje de ocupación de la zona (0-100), default 100
}

export interface PlantPPFDResult {
  plantId: string;
  averagePPFD: number | null;
  totalCoverage: number;
  zoneReadings: Array<{
    zone: number;
    coverage: number;
    ppfdValue: number | null;
    lightHeight: number | null;
    recordedAt: string | null;
  }>;
  hasAllReadings: boolean;
}

// ============================================
// PPFD / DLI
// ============================================

export interface PPFDReading {
  id: string;
  sectionId: string;
  zone: number;
  ppfdValue: number;
  lightHeight: number;
  recordedAt: string;
}

export interface DLIResult {
  sectionId: string;
  avgPPFD: number | null;
  lightHoursPerDay: number;
  dli: number | null;
  zonesWithData?: number;
  readings?: Array<{ zone: number; reading: PPFDReading | null }>;
  message?: string;
}

// ============================================
// HISTORIAL DE SENSORES
// ============================================

export interface SensorReading {
  id: string;
  deviceId: string;
  temperature?: number;
  humidity?: number;
  co2?: number;
  recordedAt: string;
}

export interface SensorStats {
  period: string;
  count: number;
  temperature: { min: number; max: number; avg: number; current: number } | null;
  humidity: { min: number; max: number; avg: number; current: number } | null;
  co2: { min: number; max: number; avg: number; current: number } | null;
}

// ============================================
// COSECHAS
// ============================================

export type HarvestProductType = 'FLOR' | 'TRIM' | 'LARF' | 'KIEF' | 'HASH' | 'ROSIN' | 'ACEITE' | 'OTRO';
export type StorageLocation = 'AMBIENTE' | 'HELADERA' | 'FREEZER';

export interface HarvestProduct {
  id: string;
  harvestId: string;
  type: HarvestProductType;
  initialWeight: number;
  currentWeight: number;
  packageType?: string;
  packageNumber?: string;
  storageLocation: StorageLocation;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Harvest {
  id: string;
  plantId: string;
  plant?: Plant;
  harvestDate: string;
  wetWeight?: number;
  dryWeight?: number;
  trimWeight?: number;
  notes?: string;
  products?: HarvestProduct[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface CreateHarvestDto {
  plantId: string;
  harvestDate: string;
  wetWeight?: number;
  dryWeight?: number;
  trimWeight?: number;
  notes?: string;
}

export interface CreateHarvestProductDto {
  harvestId: string;
  type: HarvestProductType;
  initialWeight: number;
  packageType?: string;
  packageNumber?: string;
  storageLocation?: StorageLocation;
  notes?: string;
}

// ============================================
// LAYOUT DE SECCIÓN
// ============================================

export type SectionLayoutKey =
  | 'environment'
  | 'sensors'
  | 'controllables'
  | 'cameras'
  | 'ppfd'
  | 'sensorHistory'
  | 'feedingPlans'
  | 'preventionPlans'
  | 'plants';

export interface SectionLayoutItem {
  key: SectionLayoutKey;
  enabled: boolean;
  order: number;
}

export interface SectionLayoutConfig {
  sections: SectionLayoutItem[];
}

export interface SectionLayout {
  id?: string;
  sectionId: string;
  config: SectionLayoutConfig;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Configuración por defecto del layout
export const DEFAULT_SECTION_LAYOUT: SectionLayoutConfig = {
  sections: [
    { key: 'environment', enabled: true, order: 0 },
    { key: 'sensors', enabled: true, order: 1 },
    { key: 'controllables', enabled: true, order: 2 },
    { key: 'cameras', enabled: true, order: 3 },
    { key: 'ppfd', enabled: true, order: 4 },
    { key: 'sensorHistory', enabled: true, order: 5 },
    { key: 'feedingPlans', enabled: true, order: 6 },
    { key: 'preventionPlans', enabled: true, order: 7 },
    { key: 'plants', enabled: true, order: 8 },
  ],
};

// Etiquetas e iconos para cada sección del layout
export const SECTION_LAYOUT_META: Record<SectionLayoutKey, { label: string; description: string }> = {
  environment: { label: 'Panel Ambiental', description: 'Temperatura, humedad y condiciones' },
  sensors: { label: 'Sensores', description: 'Tarjetas de sensores' },
  controllables: { label: 'Dispositivos', description: 'Luces, extractores y controles' },
  cameras: { label: 'Cámaras', description: 'Visualización de cámaras' },
  ppfd: { label: 'PPFD/DLI', description: 'Intensidad lumínica' },
  sensorHistory: { label: 'Historial Sensores', description: 'Gráfico de historial' },
  feedingPlans: { label: 'Plan Alimentación', description: 'Planes de nutrientes' },
  preventionPlans: { label: 'Plan Prevención', description: 'Planes de prevención' },
  plants: { label: 'Plantas', description: 'Tarjetas de plantas' },
};