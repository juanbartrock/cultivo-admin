---
name: Sistema Automatizacion Cultivo
overview: "Plan para implementar 5 funcionalidades: Sistema de Automatizaciones con revision de efectividad, Registro historico de sensores con graficos, Tracking de PPFD/DLI, Sistema de notificaciones in-app, y Tracking de cosecha/post-cosecha."
todos:
  - id: phase1-schema
    content: Agregar modelos de Automation, Conditions, Actions, Executions en Prisma
    status: completed
  - id: phase1-backend
    content: Crear modulo automations con scheduler y checker de efectividad
    status: completed
  - id: phase1-frontend
    content: Crear pagina /automatizaciones con CRUD y panel de historial
    status: completed
  - id: phase2-schema
    content: Agregar recordHistory a Device y modelo SensorReading
    status: completed
  - id: phase2-backend
    content: Implementar cron de registro y endpoints de historial
    status: completed
    dependencies:
      - phase2-schema
  - id: phase2-frontend
    content: Agregar graficos de temperatura/humedad en pagina de carpa
    status: completed
    dependencies:
      - phase2-backend
  - id: phase3-schema
    content: Crear modelo PPFDReading para registro por zona
    status: completed
  - id: phase3-backend
    content: Endpoints de PPFD y calculo de DLI
    status: completed
    dependencies:
      - phase3-schema
  - id: phase3-frontend
    content: Componente PPFDGrid con grilla 2x3 y registro
    status: completed
    dependencies:
      - phase3-backend
  - id: phase4-schema
    content: Crear modelo Notification con tipos y prioridades
    status: completed
  - id: phase4-backend
    content: Modulo notifications con generador automatico
    status: completed
    dependencies:
      - phase4-schema
  - id: phase4-frontend
    content: Header con badge + dropdown + pagina de notificaciones
    status: completed
    dependencies:
      - phase4-backend
  - id: phase5-schema
    content: Crear modelos Harvest y HarvestProduct
    status: completed
  - id: phase5-backend
    content: CRUD de cosechas con actualizacion de pesos
    status: completed
    dependencies:
      - phase5-schema
  - id: phase5-frontend
    content: Seccion Cosechas en seguimientos con gestion de productos
    status: completed
    dependencies:
      - phase5-backend
---

# Plan de Desarrollo - Sistema de Automatizacion de Cultivo

## Fase 1: Sistema de Automatizaciones (Prioridad Alta)

### 1.1 Modelos de Base de Datos (Prisma)

Agregar en [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma):

```prisma
// Enums nuevos
enum AutomationStatus { ACTIVE, PAUSED, DISABLED }
enum ConditionOperator { GREATER_THAN, LESS_THAN, EQUALS, BETWEEN }
enum ActionType { TURN_ON, TURN_OFF, CAPTURE_PHOTO, TRIGGER_IRRIGATION }

// Automatizacion principal
model Automation {
  id              String   @id @default(uuid())
  name            String
  description     String?
  sectionId       String   @map("section_id")
  section         Section  @relation(...)
  status          AutomationStatus @default(ACTIVE)
  interval        Int      // Intervalo en minutos (ej: 60)
  executionTime   Int?     // Tiempo de ejecucion en minutos (ej: 30)
  daysOfWeek      Int[]    // [0-6] Domingo=0
  startTime       String?  // "08:00"
  endTime         String?  // "20:00"
  priority        Int      @default(0)
  allowOverlap    Boolean  @default(true) // Si permite que otros lo activen
  conditions      AutomationCondition[]
  actions         AutomationAction[]
  executions      AutomationExecution[]
  dependsOnId     String?  // Dependencia de otra automatizacion
  notifications   Boolean  @default(true)
}

model AutomationCondition { ... }  // deviceId, operator, value, targetValue
model AutomationAction { ... }     // deviceId, actionType, duration
model AutomationExecution { ... }  // startedAt, endedAt, status, effectivenessChecks
model EffectivenessCheck { ... }   // checkedAt, conditionMet, valueAtCheck
```

### 1.2 Backend - Modulo de Automatizaciones

Crear nuevo modulo en `backend/src/modules/automations/`:

- `automations.module.ts` - Modulo con ScheduleModule de @nestjs/schedule
- `automations.service.ts` - CRUD + logica de evaluacion de condiciones
- `automations.controller.ts` - Endpoints REST
- `automation-scheduler.service.ts` - Cron job @Cron('*/1 * * * *') para evaluar automatizaciones
- `effectiveness-checker.service.ts` - Cron @Cron('*/15 * * * *') para revision de efectividad

### 1.3 Frontend - Pagina de Automatizaciones

Crear `frontend/src/app/automatizaciones/page.tsx`:

- Lista de automatizaciones con estado (activa/pausada)
- Modal de creacion/edicion con:
  - Selector de carpa/seccion
  - Configuracion de intervalo y dias
  - Builder de condiciones (dispositivo + operador + valor)
  - Builder de acciones (dispositivo + accion + duracion)
  - Opcion de dependencias entre automatizaciones
- Panel de historial de ejecuciones
- Indicador de efectividad (% de exito)
- Controles manuales (activar/pausar/ejecutar ahora)

---

## Fase 2: Registro Historico de Sensores

### 2.1 Cambios en Modelo Device

Agregar campo en `Device`:

```prisma
recordHistory Boolean @default(false) @map("record_history")
```

Nuevo modelo:

```prisma
model SensorReading {
  id          String   @id @default(uuid())
  deviceId    String
  device      Device   @relation(...)
  temperature Float?
  humidity    Float?
  recordedAt  DateTime @default(now())
  @@index([deviceId, recordedAt])
}
```

### 2.2 Backend - Servicio de Registro

En `backend/src/modules/devices/`:

- Agregar `sensor-history.service.ts` con cron @Cron('*/15 * * * *')
- Endpoint GET `/devices/:id/history?hours=6` para graficos
- Endpoint GET `/devices/:id/history?from=&to=` para rango completo

### 2.3 Frontend - Graficos de Historial

En la pagina de carpa [`frontend/src/app/sala/carpa/[id]/page.tsx`](frontend/src/app/sala/carpa/[id]/page.tsx):

- Agregar componente `SensorHistoryChart.tsx` usando recharts o chart.js
- Mostrar ultimas 6 horas por defecto
- Boton "Ver mas..." que abre modal con filtros de fecha

---

## Fase 3: PPFD y DLI

### 3.1 Modelo de Datos

```prisma
model PPFDReading {
  id          String   @id @default(uuid())
  sectionId   String
  section     Section  @relation(...)
  zone        Int      // 1-6 (zonas de la carpa)
  ppfdValue   Float    // umol/m2/s
  lightHeight Float    // cm desde el follaje
  recordedAt  DateTime @default(now())
}
```

### 3.2 Backend

Crear endpoints en `locations.controller.ts`:

- POST `/sections/:id/ppfd` - Registrar lectura
- GET `/sections/:id/ppfd/latest` - Ultimas lecturas por zona
- GET `/sections/:id/dli` - Calculo de DLI teorico (PPFD * horas luz * 0.0036)

### 3.3 Frontend

Agregar en pagina de carpa:

- Componente `PPFDGrid.tsx` - Grilla 2x3 con las 6 zonas
- Modal de registro de PPFD con selector de zona y altura
- Visualizacion del DLI calculado

---

## Fase 4: Sistema de Notificaciones In-App

### 4.1 Modelos

```prisma
enum NotificationType { AUTOMATION, FEEDING_PLAN, PREVENTION_PLAN, MILESTONE, ALERT }
enum NotificationPriority { LOW, MEDIUM, HIGH, CRITICAL }

model Notification {
  id          String   @id @default(uuid())
  type        NotificationType
  priority    NotificationPriority @default(MEDIUM)
  title       String
  message     String
  read        Boolean  @default(false)
  actionUrl   String?  // Link a la pagina relacionada
  metadata    Json?    // Datos adicionales
  createdAt   DateTime @default(now())
}
```

### 4.2 Backend

Crear `backend/src/modules/notifications/`:

- `notifications.service.ts` - CRUD + crear notificaciones programaticas
- `notifications.controller.ts` - GET /notifications, PATCH /notifications/:id/read
- `notification-generator.service.ts` - Cron diario para generar notificaciones de:
  - Planes de alimentacion (semana actual)
  - Planes de prevencion (dia actual)
  - Hitos de plantas (cambio de etapa sugerido, podas)

### 4.3 Frontend

- Agregar icono de campana en [`frontend/src/components/Header.tsx`](frontend/src/components/Header.tsx) con badge de no leidas
- Crear `frontend/src/app/notificaciones/page.tsx` - Centro de notificaciones
- Componente dropdown `NotificationDropdown.tsx` para acceso rapido

---

## Fase 5: Tracking de Cosecha (Post-Cosecha)

### 5.1 Modelos

```prisma
enum HarvestProductType { FLOR, TRIM, LARF, KIEF, HASH, ROSIN }
enum StorageLocation { AMBIENTE, HELADERA, FREEZER }

model Harvest {
  id          String   @id @default(uuid())
  plantId     String
  plant       Plant    @relation(...)
  harvestDate DateTime
  wetWeight   Float?   // Peso humedo en gramos
  dryWeight   Float?   // Peso seco
  notes       String?
  products    HarvestProduct[]
}

model HarvestProduct {
  id             String   @id @default(uuid())
  harvestId      String
  harvest        Harvest  @relation(...)
  type           HarvestProductType
  weight         Float    // gramos
  packageType    String?  // "Frasco vidrio", "Bolsa vacio"
  packageNumber  String?  // "F-001"
  storageLocation StorageLocation @default(AMBIENTE)
  currentWeight  Float?   // Peso actual (se actualiza al extraer)
  notes          String?
}
```

### 5.2 Backend

Crear `backend/src/modules/harvest/`:

- CRUD para Harvest y HarvestProduct
- Endpoint para actualizar peso (extracciones parciales)

### 5.3 Frontend

Crear nueva seccion en [`frontend/src/app/seguimientos/page.tsx`](frontend/src/app/seguimientos/page.tsx):

- Tab o seccion "Cosechas" al lado de los ciclos
- Lista de cosechas por planta
- Modal de registro con peso humedo/seco
- Sub-modal para productos (flor, trim, extracciones)
- Edicion de paquetes y ubicaciones

---

## Archivos Clave a Crear/Modificar

| Fase | Backend | Frontend |

|------|---------|----------|

| 1 | `modules/automations/*` (nuevo) | `app/automatizaciones/page.tsx` (nuevo) |

| 2 | `modules/devices/sensor-history.service.ts` | `components/SensorHistoryChart.tsx` |

| 3 | Endpoints en `locations/` | `components/PPFDGrid.tsx` |

| 4 | `modules/notifications/*` (nuevo) | `components/NotificationDropdown.tsx`, `app/notificaciones/page.tsx` |

| 5 | `modules/harvest/*` (nuevo) | Seccion en `seguimientos/page.tsx` |

---

## Dependencias a Instalar

**Backend:**

```bash
npm install @nestjs/schedule
```

**Frontend:**

```bash
npm install recharts  # Para graficos de historial
```