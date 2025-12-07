// Conectores de dispositivos IoT
export enum Connector {
  SONOFF = 'SONOFF',
  TUYA = 'TUYA',
  TAPO = 'TAPO',
}

// Tipos de dispositivos
export enum DeviceType {
  SENSOR = 'SENSOR',
  LUZ = 'LUZ',
  EXTRACTOR = 'EXTRACTOR',
  VENTILADOR = 'VENTILADOR',
  HUMIDIFICADOR = 'HUMIDIFICADOR',
  DESHUMIDIFICADOR = 'DESHUMIDIFICADOR',
  AIRE_ACONDICIONADO = 'AIRE_ACONDICIONADO',
  BOMBA_RIEGO = 'BOMBA_RIEGO',
  CALEFACTOR = 'CALEFACTOR',
  CAMARA = 'CAMARA',
}

// Tipos de genéticas
export enum StrainType {
  SATIVA = 'SATIVA',
  INDICA = 'INDICA',
  RUDERALIS = 'RUDERALIS',
  HYBRID = 'HYBRID',
}

// Estados del ciclo de cultivo
export enum CycleStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CURED = 'CURED',
}

// Etapas de la planta
export enum PlantStage {
  GERMINACION = 'GERMINACION',
  VEGETATIVO = 'VEGETATIVO',
  PRE_FLORA = 'PRE_FLORA',
  FLORACION = 'FLORACION',
  SECADO = 'SECADO',
  CURADO = 'CURADO',
}

// Sexo de la planta
export enum PlantSex {
  FEM = 'FEM',
  REG = 'REG',
  AUTO = 'AUTO',
  UNKNOWN = 'UNKNOWN',
}

// Tipos de eventos en la bitácora
export enum EventType {
  RIEGO = 'RIEGO',
  PODA = 'PODA',
  CAMBIO_FOTOPERIODO = 'CAMBIO_FOTOPERIODO',
  TRANSPLANTE = 'TRANSPLANTE',
  NOTA = 'NOTA',
  FOTO = 'FOTO',
  PARAMETRO_AMBIENTAL = 'PARAMETRO_AMBIENTAL',
}
