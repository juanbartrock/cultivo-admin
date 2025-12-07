# Especificación de Integración Frontend-Backend

Este documento describe los cambios necesarios en el frontend para integrarse con el nuevo backend NestJS.

## Resumen de Cambios

1. **Nueva API centralizada** - Todas las llamadas pasan por el backend (puerto 4000)
2. **Persistencia real** - Los datos se guardan en PostgreSQL/Supabase
3. **Nuevos endpoints** - CRUD completo para todas las entidades
4. **Tipos actualizados** - Nuevas interfaces alineadas con el backend

---

## 1. Configuración Base

### URL de la API

```typescript
// Antes (llamadas directas a microservicios)
const SONOFF_URL = 'http://localhost:3000';
const TUYA_URL = 'http://localhost:3002';
const TAPO_URL = 'http://localhost:3003';

// Ahora (todo a través del backend)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
```

### Variable de entorno para Next.js

Agregar en `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 2. Nuevos Tipos TypeScript

### Enums del Backend

```typescript
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
export type PlantStage = 'GERMINACION' | 'VEGETATIVO' | 'FLORACION' | 'SECADO' | 'CURADO';

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
```

### Interfaces de Entidades

```typescript
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
  events: Event[];
  createdAt: string;
  updatedAt: string;
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
  events?: Event[];
  createdAt: string;
  updatedAt: string;
}

// Evento de bitácora
export interface Event {
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
```

### Interfaces para Dispositivos Escaneados

```typescript
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
```

---

## 3. Servicios de API

### apiService.ts (nuevo archivo base)

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
```

### locationService.ts

```typescript
import { api } from './apiService';
import { Room, Section } from '@/types';

// Salas
export const roomService = {
  getAll: () => api.get<Room[]>('/rooms'),
  getById: (id: string) => api.get<Room>(`/rooms/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post<Room>('/rooms', data),
  update: (id: string, data: Partial<Room>) =>
    api.put<Room>(`/rooms/${id}`, data),
  delete: (id: string) => api.delete(`/rooms/${id}`),
  getSections: (id: string) => api.get<Section[]>(`/rooms/${id}/sections`),
};

// Secciones
export const sectionService = {
  getAll: () => api.get<Section[]>('/sections'),
  getById: (id: string) => api.get<Section>(`/sections/${id}`),
  getDashboard: (id: string) => api.get<SectionDashboard>(`/sections/${id}/dashboard`),
  create: (data: CreateSectionDto) => api.post<Section>('/sections', data),
  update: (id: string, data: Partial<Section>) =>
    api.put<Section>(`/sections/${id}`, data),
  delete: (id: string) => api.delete(`/sections/${id}`),
};

interface SectionDashboard extends Section {
  summary: {
    totalPlants: number;
    totalDevices: number;
    plantsByStage: Record<string, number>;
  };
}

interface CreateSectionDto {
  name: string;
  dimensions?: string;
  image?: string;
  description?: string;
  roomId: string;
}
```

### deviceService.ts (actualizado)

```typescript
import { api } from './apiService';
import { Device, ScannedDevice, Connector, DeviceType } from '@/types';

export const deviceService = {
  // Listar dispositivos registrados en DB
  getAll: () => api.get<Device[]>('/devices'),
  
  // Escanear todos los conectores IoT
  scan: () => api.get<ScannedDevice[]>('/devices/scan'),
  
  // Verificar salud de conectores
  getConnectorsHealth: () => api.get<Record<Connector, boolean>>('/devices/health'),
  
  // Obtener dispositivo por ID
  getById: (id: string) => api.get<Device>(`/devices/${id}`),
  
  // Estado en tiempo real (consulta al microservicio)
  getStatus: (id: string) => api.get<{ device: Device; status: DeviceStatus }>(`/devices/${id}/status`),
  
  // Asignar dispositivo a sección
  assign: (data: AssignDeviceDto) => api.post<Device>('/devices/assign', data),
  
  // Controlar dispositivo (on/off)
  control: (id: string, action: 'on' | 'off') =>
    api.post<{ device: Device; action: string; result: { success: boolean } }>(
      `/devices/${id}/control`,
      { action }
    ),
  
  // Eliminar dispositivo
  delete: (id: string) => api.delete(`/devices/${id}`),
};

interface AssignDeviceDto {
  connector: Connector;
  externalId: string;
  sectionId: string;
  name?: string;
  type?: DeviceType;
  metadata?: Record<string, unknown>;
}

interface DeviceStatus {
  online: boolean;
  state?: 'on' | 'off';
  temperature?: number;
  humidity?: number;
  [key: string]: unknown;
}
```

### growService.ts (nuevo)

```typescript
import { api } from './apiService';
import { Strain, Cycle, Plant, StrainType, CycleStatus, PlantStage, PlantSex } from '@/types';

// Genéticas
export const strainService = {
  getAll: () => api.get<Strain[]>('/strains'),
  getById: (id: string) => api.get<Strain>(`/strains/${id}`),
  create: (data: CreateStrainDto) => api.post<Strain>('/strains', data),
  update: (id: string, data: Partial<Strain>) =>
    api.put<Strain>(`/strains/${id}`, data),
  delete: (id: string) => api.delete(`/strains/${id}`),
};

// Ciclos
export const cycleService = {
  getAll: (status?: CycleStatus) =>
    api.get<Cycle[]>(`/cycles${status ? `?status=${status}` : ''}`),
  getById: (id: string) => api.get<CycleWithSummary>(`/cycles/${id}`),
  create: (data: CreateCycleDto) => api.post<Cycle>('/cycles', data),
  update: (id: string, data: Partial<Cycle>) =>
    api.put<Cycle>(`/cycles/${id}`, data),
  complete: (id: string) => api.post<Cycle>(`/cycles/${id}/complete`, {}),
  delete: (id: string) => api.delete(`/cycles/${id}`),
};

// Plantas
export const plantService = {
  getAll: (filters?: { cycleId?: string; sectionId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.cycleId) params.set('cycleId', filters.cycleId);
    if (filters?.sectionId) params.set('sectionId', filters.sectionId);
    return api.get<Plant[]>(`/plants?${params}`);
  },
  getById: (id: string) => api.get<Plant>(`/plants/${id}`),
  create: (data: CreatePlantDto) => api.post<Plant>('/plants', data),
  update: (id: string, data: Partial<Plant>) =>
    api.put<Plant>(`/plants/${id}`, data),
  move: (id: string, data: { sectionId?: string; stage?: PlantStage }) =>
    api.patch<Plant>(`/plants/${id}/move`, data),
  delete: (id: string) => api.delete(`/plants/${id}`),
};

// DTOs
interface CreateStrainDto {
  name: string;
  breeder?: string;
  type: StrainType;
  floweringDaysExpected?: number;
  description?: string;
}

interface CreateCycleDto {
  name: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

interface CreatePlantDto {
  tagCode: string;
  strainId: string;
  cycleId: string;
  sectionId: string;
  stage?: PlantStage;
  sex?: PlantSex;
  photo?: string;
  notes?: string;
}

interface CycleWithSummary extends Cycle {
  summary: {
    totalPlants: number;
    totalEvents: number;
    plantsByStage: Record<string, number>;
  };
}
```

### eventService.ts (nuevo)

```typescript
import { api } from './apiService';
import { Event, EventType } from '@/types';

export const eventService = {
  // Listar eventos con filtros
  getAll: (filters?: {
    plantId?: string;
    cycleId?: string;
    sectionId?: string;
    type?: EventType;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.plantId) params.set('plantId', filters.plantId);
    if (filters?.cycleId) params.set('cycleId', filters.cycleId);
    if (filters?.sectionId) params.set('sectionId', filters.sectionId);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.limit) params.set('limit', filters.limit.toString());
    return api.get<Event[]>(`/events?${params}`);
  },

  // Estadísticas
  getStats: (filters?: { cycleId?: string; sectionId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.cycleId) params.set('cycleId', filters.cycleId);
    if (filters?.sectionId) params.set('sectionId', filters.sectionId);
    return api.get<Record<string, number>>(`/events/stats?${params}`);
  },

  // Registrar riego
  createWaterEvent: (data: WaterEventDto) =>
    api.post<Event>('/events/water', data),

  // Crear nota
  createNoteEvent: (data: NoteEventDto) =>
    api.post<Event>('/events/note', data),

  // Registrar parámetros ambientales
  createEnvironmentEvent: (data: EnvironmentEventDto) =>
    api.post<Event>('/events/environment', data),

  // Subir foto (requiere FormData)
  createPhotoEvent: async (data: PhotoEventDto, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    if (data.plantId) formData.append('plantId', data.plantId);
    if (data.cycleId) formData.append('cycleId', data.cycleId);
    if (data.sectionId) formData.append('sectionId', data.sectionId);
    if (data.caption) formData.append('caption', data.caption);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/events/photo`,
      { method: 'POST', body: formData }
    );
    return response.json() as Promise<Event>;
  },

  // Eliminar evento
  delete: (id: string) => api.delete(`/events/${id}`),
};

// DTOs
interface BaseEventDto {
  plantId?: string;
  cycleId?: string;
  sectionId?: string;
}

interface WaterEventDto extends BaseEventDto {
  ph?: number;
  ec?: number;
  waterTemperature?: number;
  liters?: number;
  nutrients?: { name: string; dose: string }[];
  notes?: string;
}

interface NoteEventDto extends BaseEventDto {
  content: string;
  tags?: string[];
}

interface EnvironmentEventDto extends BaseEventDto {
  temperature?: number;
  humidity?: number;
  co2?: number;
  lightIntensity?: number;
  notes?: string;
}

interface PhotoEventDto extends BaseEventDto {
  caption?: string;
}
```

---

## 4. Cambios Específicos por Página

### `/artefactos` - Gestión de Dispositivos

**Antes:** Consultaba directamente a los 3 microservicios y guardaba en memoria.

**Ahora:** Usa el backend que:
1. Escanea los 3 microservicios (`GET /devices/scan`)
2. Persiste asignaciones en DB (`POST /devices/assign`)
3. Controla dispositivos (`POST /devices/:id/control`)

```typescript
// Ejemplo de uso en la página de artefactos
import { deviceService } from '@/services/deviceService';

// Escanear dispositivos
const scannedDevices = await deviceService.scan();

// Asignar dispositivo a una sección
await deviceService.assign({
  connector: 'TUYA',
  externalId: 'bf1234567890',
  sectionId: 'uuid-de-la-seccion',
  name: 'Extractor Flora',
  type: 'EXTRACTOR',
});

// Controlar dispositivo
await deviceService.control(deviceId, 'on');
```

### `/sala` - Dashboard de Sala

**Antes:** Usaba datos mock de `mockData.ts`.

**Ahora:** Consume la API real:

```typescript
import { roomService, sectionService } from '@/services/locationService';

// Obtener sala con secciones
const room = await roomService.getById(roomId);

// Obtener dashboard de una sección (incluye dispositivos y plantas)
const dashboard = await sectionService.getDashboard(sectionId);
```

### `/seguimientos` - Ciclos de Cultivo

**Antes:** No implementado o datos mock.

**Ahora:** CRUD completo:

```typescript
import { cycleService, plantService } from '@/services/growService';

// Listar ciclos activos
const cycles = await cycleService.getAll('ACTIVE');

// Crear ciclo
const newCycle = await cycleService.create({
  name: 'Invierno 2025',
  startDate: '2025-01-15',
});

// Agregar planta al ciclo
await plantService.create({
  tagCode: 'BD-001',
  strainId: strainId,
  cycleId: newCycle.id,
  sectionId: sectionId,
  stage: 'GERMINACION',
  sex: 'FEM',
});

// Mover planta a floración
await plantService.move(plantId, { stage: 'FLORACION' });
```

### Bitácora de Eventos

**Nueva funcionalidad** para registrar actividades:

```typescript
import { eventService } from '@/services/eventService';

// Registrar riego
await eventService.createWaterEvent({
  sectionId: sectionId,
  ph: 6.2,
  ec: 1.4,
  liters: 5,
  nutrients: [
    { name: 'Bio Grow', dose: '2ml/L' },
    { name: 'CalMag', dose: '1ml/L' },
  ],
});

// Subir foto
const file = inputElement.files[0];
await eventService.createPhotoEvent(
  { plantId: plantId, caption: 'Semana 3 floración' },
  file
);

// Ver historial de una planta
const events = await eventService.getAll({ plantId: plantId, limit: 20 });
```

---

## 5. Migración de Datos Mock

### Eliminar dependencia de mockData.ts

Los datos mock en `src/data/mockData.ts` deben reemplazarse gradualmente con llamadas a la API.

### Crear datos iniciales

Para desarrollo, puedes crear datos iniciales usando la API:

```typescript
// Script de seed (ejecutar una vez)
async function seedData() {
  // 1. Crear sala
  const room = await roomService.create({
    name: 'Habitación Cultivo',
    description: 'Sala principal de cultivo indoor',
  });

  // 2. Crear secciones
  const floraSection = await sectionService.create({
    name: 'Carpa Floración',
    dimensions: '120x120x200',
    image: '/images/carpa-flora.png',
    roomId: room.id,
  });

  // 3. Crear genéticas
  const strain = await strainService.create({
    name: 'Blue Dream',
    breeder: 'Humboldt Seeds',
    type: 'HYBRID',
    floweringDaysExpected: 65,
  });

  // 4. Crear ciclo
  const cycle = await cycleService.create({
    name: 'Verano 2025',
    startDate: new Date().toISOString(),
  });

  // 5. Crear plantas
  await plantService.create({
    tagCode: 'BD-001',
    strainId: strain.id,
    cycleId: cycle.id,
    sectionId: floraSection.id,
    stage: 'VEGETATIVO',
    sex: 'FEM',
  });
}
```

---

## 6. Documentación de la API

La documentación completa con ejemplos interactivos está disponible en:

**Swagger UI:** http://localhost:4000/docs

Incluye:
- Todos los endpoints con parámetros
- Schemas de request/response
- Ejemplos de uso
- Códigos de error

---

## 7. Checklist de Migración

- [ ] Agregar variable `NEXT_PUBLIC_API_URL` al `.env.local`
- [ ] Crear `apiService.ts` con el cliente base
- [ ] Actualizar `deviceService.ts` para usar backend
- [ ] Crear `locationService.ts` (rooms, sections)
- [ ] Crear `growService.ts` (strains, cycles, plants)
- [ ] Crear `eventService.ts` (bitácora)
- [ ] Actualizar tipos en `types/index.ts`
- [ ] Migrar página `/artefactos` a usar nueva API
- [ ] Migrar página `/sala` a usar nueva API
- [ ] Implementar página `/seguimientos` con CRUD de ciclos
- [ ] Eliminar datos mock gradualmente
- [ ] Agregar manejo de errores y estados de carga

---

## 8. Notas Importantes

### Autenticación

Por ahora el backend no tiene autenticación. Cuando se implemente, será necesario:
1. Agregar token JWT a los headers
2. Implementar login/registro en frontend
3. Proteger rutas privadas

### Manejo de Errores

El backend devuelve errores en formato:

```json
{
  "statusCode": 404,
  "message": "Room with ID xxx not found",
  "error": "Not Found"
}
```

### CORS

El backend tiene CORS habilitado para desarrollo. En producción, configurar los orígenes permitidos.

### WebSockets (Futuro)

Para actualizaciones en tiempo real de sensores, se planea implementar WebSockets. Por ahora, usar polling con intervalo razonable (5-10 segundos).
