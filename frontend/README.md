# Cultivo Manager - Frontend

Interfaz de usuario para el sistema de administración de cultivo casero. Consume la API centralizada del backend NestJS.

## Stack Tecnológico

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Framer Motion** - Animaciones fluidas
- **Lucide React** - Iconos modernos

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variable de entorno (opcional)
cp .env.local.example .env.local

# Iniciar en modo desarrollo
npm run dev
```

Acceder a http://localhost:3000

> **Nota**: El frontend requiere que el backend esté corriendo en http://localhost:4000

## Build de Producción

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t cultivo-frontend .
docker run -p 3000:3000 cultivo-frontend
```

## Configuración

### Variables de Entorno

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Si no se configura, usa `http://localhost:4000/api` por defecto.

---

## Arquitectura

### Estructura del Proyecto

```
src/
├── app/                        # Páginas (App Router)
│   ├── page.tsx                # Landing con animación de puertas
│   ├── layout.tsx              # Layout principal
│   ├── globals.css             # Estilos globales
│   ├── sala/                   # Dashboard de sala
│   │   ├── page.tsx            # Vista general con secciones
│   │   └── carpa/[id]/         # Detalle de sección
│   ├── artefactos/             # Gestión de dispositivos IoT
│   │   └── page.tsx            # Autodescubrimiento + asignación
│   └── seguimientos/           # Ciclos y plantas
│       └── page.tsx            # CRUD de ciclos, plantas, eventos
├── components/                 # Componentes reutilizables
│   ├── Header.tsx              # Navegación principal
│   ├── CarpaCard.tsx           # Card de sección
│   ├── SensorCard.tsx          # Card de dispositivo
│   ├── PlantCard.tsx           # Card de planta
│   └── DoorAnimation.tsx       # Animación de entrada
├── services/                   # Servicios de API
│   ├── apiService.ts           # Cliente HTTP base
│   ├── deviceService.ts        # Dispositivos IoT
│   ├── locationService.ts      # Salas y secciones
│   ├── growService.ts          # Genéticas, ciclos, plantas
│   └── eventService.ts         # Bitácora de eventos
├── hooks/                      # Custom hooks
│   └── useWeather.ts           # Hook del clima
├── data/                       # Datos mock (deprecated)
│   └── mockData.ts             # Solo referencia
└── types/                      # Interfaces TypeScript
    └── index.ts                # Todos los tipos
```

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                         Páginas (App Router)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │    /sala    │  │ /artefactos │  │     /seguimientos       │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Servicios de API                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │locationService│ │deviceService │  │ growService          │  │
│  │  • rooms      │ │  • scan      │  │  • cycles            │  │
│  │  • sections   │ │  • assign    │  │  • plants            │  │
│  └───────┬───────┘ │  • control   │  │  • strains           │  │
│          │         └───────┬──────┘  └──────────┬───────────┘  │
│          │                 │                    │              │
│          └────────────┬────┴────────────────────┘              │
│                       ▼                                         │
│               ┌─────────────┐                                   │
│               │ apiService  │  ← Cliente HTTP base              │
│               └──────┬──────┘                                   │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       ▼
              Backend NestJS
           http://localhost:4000/api
```

---

## Servicios de API

### `apiService.ts`

Cliente HTTP base que todas las llamadas usan:

```typescript
import { api } from '@/services/apiService';

// GET
const rooms = await api.get<Room[]>('/rooms');

// POST
const newCycle = await api.post<Cycle>('/cycles', { name: 'Verano 2025' });

// PUT
await api.put(`/rooms/${id}`, { name: 'Nuevo nombre' });

// DELETE
await api.delete(`/devices/${id}`);
```

### `deviceService.ts`

Gestión de dispositivos IoT:

```typescript
import { deviceService } from '@/services/deviceService';

// Escanear todos los conectores (Sonoff, Tuya, Tapo)
const { dispositivos, errores } = await deviceService.scan();

// Asignar dispositivo a una sección
await deviceService.assign({
  connector: 'TUYA',
  externalId: 'bf1234567890',
  sectionId: 'uuid-seccion',
  name: 'Extractor Flora',
  type: 'EXTRACTOR',
});

// Controlar dispositivo
await deviceService.control(deviceId, 'on');
await deviceService.control(deviceId, 'off');

// Obtener estado en tiempo real
const { status } = await deviceService.getStatus(deviceId);
```

### `locationService.ts`

Salas y secciones:

```typescript
import { roomService, sectionService } from '@/services/locationService';

// Salas
const rooms = await roomService.getAll();
const room = await roomService.getById(id);
await roomService.create({ name: 'Sala Principal' });

// Secciones
const sections = await sectionService.getAll();
const dashboard = await sectionService.getDashboard(sectionId);
await sectionService.create({
  name: 'Carpa Floración',
  dimensions: '120x120x200',
  roomId: roomId,
});
```

### `growService.ts`

Genéticas, ciclos y plantas:

```typescript
import { strainService, cycleService, plantService } from '@/services/growService';

// Genéticas
const strains = await strainService.getAll();
await strainService.create({ name: 'Blue Dream', type: 'HYBRID' });

// Ciclos
const cycles = await cycleService.getAll('ACTIVE');
await cycleService.create({ name: 'Invierno 2025', startDate: '2025-01-15' });
await cycleService.complete(cycleId);

// Plantas
const plants = await plantService.getAll({ cycleId });
await plantService.create({
  tagCode: 'BD-001',
  strainId: strainId,
  cycleId: cycleId,
  sectionId: sectionId,
  stage: 'GERMINACION',
  sex: 'FEM',
});
await plantService.move(plantId, { stage: 'FLORACION' });
```

### `eventService.ts`

Bitácora de eventos:

```typescript
import { eventService } from '@/services/eventService';

// Registrar riego
await eventService.createWaterEvent({
  cycleId: cycleId,
  ph: 6.2,
  ec: 1.4,
  liters: 5,
});

// Crear nota
await eventService.createNoteEvent({
  cycleId: cycleId,
  content: 'Plantas saludables, sin plagas',
});

// Registrar parámetros ambientales
await eventService.createEnvironmentEvent({
  sectionId: sectionId,
  temperature: 25,
  humidity: 60,
});

// Obtener historial
const events = await eventService.getAll({ cycleId, limit: 20 });
```

---

## Tipos Principales

### Entidades del Backend

```typescript
// Sección/Carpa
interface Section {
  id: string;
  name: string;
  dimensions?: string;
  description?: string;
  roomId: string;
  devices: Device[];
  plants: Plant[];
}

// Dispositivo IoT
interface Device {
  id: string;
  name: string;
  connector: 'SONOFF' | 'TUYA' | 'TAPO';
  externalId: string;
  type: DeviceType;
  sectionId?: string;
}

// Planta
interface Plant {
  id: string;
  tagCode: string;
  strainId: string;
  strain?: Strain;
  cycleId: string;
  sectionId: string;
  stage: PlantStage;
  sex: PlantSex;
}

// Ciclo de cultivo
interface Cycle {
  id: string;
  name: string;
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CURED';
  plants: Plant[];
}
```

### Enums

```typescript
type DeviceType = 
  | 'SENSOR' | 'LUZ' | 'EXTRACTOR' | 'VENTILADOR' 
  | 'HUMIDIFICADOR' | 'DESHUMIDIFICADOR' | 'AIRE_ACONDICIONADO'
  | 'BOMBA_RIEGO' | 'CALEFACTOR' | 'CAMARA';

type PlantStage = 
  | 'GERMINACION' | 'VEGETATIVO' | 'FLORACION' | 'SECADO' | 'CURADO';

type PlantSex = 'FEM' | 'REG' | 'AUTO' | 'UNKNOWN';

type EventType = 
  | 'RIEGO' | 'PODA' | 'CAMBIO_FOTOPERIODO' | 'TRANSPLANTE'
  | 'NOTA' | 'FOTO' | 'PARAMETRO_AMBIENTAL';
```

---

## Páginas

### `/` - Landing

Animación de puertas corredizas para ingresar al sistema.

### `/sala` - Dashboard

Vista general de la sala de cultivo:
- Indicadores de clima (temperatura, humedad)
- Listado de secciones/carpas
- Botón para crear nuevas secciones

### `/sala/carpa/[id]` - Detalle de Sección

Información detallada de una sección:
- Dispositivos asignados
- Plantas en la sección
- Resumen por etapa

### `/artefactos` - Gestión de Dispositivos

Panel de autodescubrimiento y asignación:
1. **Escaneo**: Detecta dispositivos de Sonoff, Tuya y Tapo
2. **Asignación**: Vincula dispositivos a secciones
3. **Control**: Enciende/apaga dispositivos
4. **Desasignación**: Remueve dispositivos del sistema

### `/seguimientos` - Ciclos y Plantas

Gestión completa del cultivo:
- CRUD de ciclos de cultivo
- Agregar/gestionar plantas
- Gestión de genéticas
- Registro de eventos (riego, notas, parámetros)

---

## Componentes

### `CarpaCard`

Card para mostrar una sección. Recibe `Section`.

### `SensorCard`

Card para mostrar un dispositivo. Recibe `Device`.

### `PlantCard`

Card para mostrar una planta. Recibe `Plant`.

---

## Estilos

El proyecto usa una paleta personalizada en `tailwind.config.ts`:

- `cultivo-green-*` - Tonos verdes para elementos principales
- `zinc-*` - Grises para fondos y texto secundario

---

## Scripts

```bash
npm run dev      # Desarrollo con hot-reload
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # Linting con ESLint
```

---

## Migración desde Datos Mock

El frontend fue migrado de datos mock (`mockData.ts`) a consumir la API real del backend. Los cambios principales fueron:

1. **Nuevo cliente HTTP** (`apiService.ts`)
2. **Servicios especializados** por entidad
3. **Tipos actualizados** alineados con el backend
4. **Páginas refactorizadas** para usar API real
5. **Componentes actualizados** para nuevos tipos

El archivo `mockData.ts` se mantiene como referencia pero está marcado como `@deprecated`.
