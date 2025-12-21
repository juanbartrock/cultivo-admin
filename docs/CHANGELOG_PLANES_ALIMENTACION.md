# Changelog - Sistema de Planes de Alimentación

## Fecha: Diciembre 2025

### Resumen de Cambios

Implementación completa del sistema de planes de alimentación con integración a eventos de riego y visualización mejorada en el historial.

---

## 📦 Backend

### Nuevos Archivos

#### `backend/src/modules/feeding-plans/feeding-plans.module.ts`
- Módulo NestJS que registra el controlador y servicio de planes de alimentación
- Exporta `FeedingPlansService` y `FeedingPlansController`

#### `backend/src/modules/feeding-plans/feeding-plans.service.ts`
**Funcionalidades implementadas:**
- `findAll(stage?)`: Lista todos los planes, opcionalmente filtrados por etapa
- `findById(id)`: Obtiene un plan específico con sus semanas
- `create(data)`: Crea un plan vacío
- `import(data)`: Importa un plan completo desde JSON con semanas
- `update(id, data)`: Actualiza información básica del plan
- `delete(id)`: Elimina un plan (valida que no tenga plantas asignadas)
- `addOrUpdateWeek(planId, week)`: Agrega o actualiza una semana
- `deleteWeek(planId, weekNumber)`: Elimina una semana específica
- `assignToPlant(plantId, planId, stageStartDate)`: Asigna un plan a una planta
- `unassignFromPlant(plantId, planId)`: Desasigna un plan de una planta
- `getSectionFeedingPlans(sectionId)`: Obtiene todos los planes de plantas en una sección con cálculo de semana actual
- `calculateCurrentWeek(stageStartDate)`: Calcula la semana actual basándose en la fecha de inicio

**Nota técnica:** Manejo explícito de campos `Json` de Prisma usando `JSON.parse(JSON.stringify(...))` para evitar errores de tipo.

#### `backend/src/modules/feeding-plans/feeding-plans.controller.ts`
**Endpoints implementados:**

**Planes:**
- `GET /api/feeding-plans` - Lista todos los planes
- `GET /api/feeding-plans/:id` - Obtiene un plan específico
- `POST /api/feeding-plans` - Crea un plan vacío
- `POST /api/feeding-plans/import` - Importa plan desde JSON
- `PUT /api/feeding-plans/:id` - Actualiza un plan
- `DELETE /api/feeding-plans/:id` - Elimina un plan

**Semanas:**
- `POST /api/feeding-plans/:id/weeks` - Agrega/actualiza semana
- `DELETE /api/feeding-plans/:id/weeks/:weekNumber` - Elimina semana

**Asignaciones:**
- `POST /api/plants/:id/feeding-plan` - Asigna plan a planta
- `DELETE /api/plants/:id/feeding-plan/:planId` - Desasigna plan

**Secciones:**
- `GET /api/sections/:id/feeding-plans` - Obtiene planes de plantas en sección

#### `backend/src/modules/feeding-plans/dto/feeding-plan.dto.ts`
**DTOs definidos:**
- `FeedingProductDto`: `{ name: string, dose: string, unit: string }`
- `FeedingPlanWeekDto`: Semana con productos, pH, EC, notas
- `ImportFeedingPlanDto`: DTO para importación completa
- `CreateFeedingPlanDto`: DTO para creación básica
- `UpdateFeedingPlanDto`: DTO para actualización
- `AssignFeedingPlanDto`: DTO para asignación a planta
- `AddWeekDto`: DTO para agregar semana

### Archivos Modificados

#### `backend/prisma/schema.prisma`
**Nuevos modelos agregados:**

```prisma
model FeedingPlan {
  id          String             @id @default(uuid())
  name        String
  description String?
  stage       PlantStage
  weeks       FeedingPlanWeek[]
  plants      PlantFeedingPlan[]
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
}

model FeedingPlanWeek {
  id            String      @id @default(uuid())
  feedingPlanId String
  feedingPlan   FeedingPlan @relation(...)
  weekNumber    Int
  products      Json        // Array de productos
  ph            Float?
  ec            Float?
  notes         String?
}

model PlantFeedingPlan {
  id            String      @id @default(uuid())
  plantId       String
  feedingPlanId String
  stageStartDate DateTime
  createdAt     DateTime    @default(now())
}
```

**Modificaciones al modelo `Plant`:**
- Agregada relación `feedingPlans: PlantFeedingPlan[]`

#### `backend/src/app.module.ts`
- Agregado `FeedingPlansModule` a los imports

#### `backend/src/modules/events/dto/event.dto.ts`
**Modificaciones:**
- Agregado campo `nutrients?: { name: string; dose: string }[]` a `CreateWaterEventDto`
- Agregado campo `notes?: string` a `CreateWaterEventDto`

#### `backend/src/modules/events/events.service.ts`
**Modificaciones:**
- `createWaterEvent()` ahora guarda `nutrients` y `notes` en el campo `data` del evento

---

## 🎨 Frontend

### Nuevos Archivos

#### `frontend/src/services/feedingPlanService.ts`
Servicio completo para interactuar con la API de planes de alimentación.

**Métodos:**
- `getAll(stage?)`: Obtiene todos los planes
- `getById(id)`: Obtiene un plan específico
- `create(data)`: Crea un plan vacío
- `import(data)`: Importa plan desde JSON
- `update(id, data)`: Actualiza un plan
- `delete(id)`: Elimina un plan
- `addOrUpdateWeek(planId, week)`: Agrega/actualiza semana
- `deleteWeek(planId, weekNumber)`: Elimina semana
- `assignToPlant(plantId, data)`: Asigna plan a planta
- `unassignFromPlant(plantId, planId)`: Desasigna plan
- `getSectionFeedingPlans(sectionId)`: Obtiene planes de sección

#### `frontend/src/components/FeedingPlanCard.tsx`
Componente para mostrar información de un plan asignado a una planta.

**Características:**
- Muestra semana actual, anterior y siguiente
- Badge de etapa con colores diferenciados
- Lista de productos con dosis y unidades
- Indicadores de pH y EC
- Diseño responsive con colores temáticos

#### `frontend/src/components/FeedingPlanUpload.tsx`
Modal para importar planes desde JSON.

**Características:**
- Dos modos de entrada: archivo JSON o texto directo
- Validación de estructura JSON
- Vista previa antes de importar
- Botón para descargar ejemplo JSON
- Manejo de errores con mensajes claros

### Archivos Modificados

#### `frontend/src/types/index.ts`
**Nuevos tipos agregados:**

```typescript
export interface FeedingProduct {
  name: string;
  dose: string;
  unit: string;
}

export interface FeedingPlanWeek {
  id?: string;
  weekNumber: number;
  products: FeedingProduct[];
  ph?: number;
  ec?: number;
  notes?: string;
}

export interface FeedingPlan {
  id: string;
  name: string;
  description?: string;
  stage: PlantStage;
  weeks: FeedingPlanWeek[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedingPlanWithCount extends FeedingPlan {
  _count: {
    plants: number;
  };
}

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

export interface PlantWithFeedingPlans {
  id: string;
  tagCode: string;
  feedingPlans: PlantFeedingPlan[];
}
```

**Modificaciones a tipos existentes:**
- `WaterEventDto`: Agregados campos `nutrients?` y `notes?`

#### `frontend/src/app/sala/carpa/[id]/page.tsx`
**Cambios principales:**

1. **Nuevos estados:**
   - `feedingPlans`: Datos de planes de la sección
   - `availablePlans`: Planes disponibles para asignar
   - `showUploadModal`: Control de modal de importación
   - `showAssignModal`: Control de modal de asignación
   - `assigningPlan`: Estado de carga al asignar
   - `planToDelete`: Plan seleccionado para eliminar
   - `deletingPlan`: Estado de carga al eliminar

2. **Nuevas funciones:**
   - `loadFeedingPlans()`: Carga planes asignados a plantas de la sección
   - `loadAvailablePlans()`: Carga todos los planes disponibles
   - `handleAssignPlan()`: Maneja asignación de plan a planta
   - `handleDeletePlan()`: Maneja eliminación de plan

3. **Modificaciones al `PlantEventModal`:**
   - Nuevo prop `feedingPlanInfo` con datos del plan
   - Pre-llena pH y EC del plan
   - Muestra nombre del plan y semana en header
   - Lista de nutrientes con checkboxes
   - Cálculo automático de totales (litros × dosis)
   - Campo de notas opcionales
   - Envía `nutrients` y `notes` al crear evento

4. **Nueva sección UI "Plan de Alimentación":**
   - Muestra planes asignados con `FeedingPlanCard`
   - Lista de planes disponibles para asignar
   - Botón para importar primer plan
   - Botones para asignar y eliminar planes
   - Modal de confirmación para eliminación

#### `frontend/src/app/seguimientos/page.tsx`
**Cambios en visualización de eventos:**

1. **Mejoras en renderizado de eventos de riego:**
   - Muestra pH, EC y Litros en línea principal
   - Badges cyan para nutrientes aplicados
   - Notas en cursiva si existen
   - Manejo robusto de datos faltantes

2. **Estructura mejorada:**
   ```tsx
   {event.type === 'RIEGO' && (
     <>
       <p>pH: X • EC: Y • ZL</p>
       {nutrients && (
         <div>
           {nutrients.map(n => (
             <span>{n.name}: {n.dose}</span>
           ))}
         </div>
       )}
       {notes && <p>"{notes}"</p>}
     </>
   )}
   ```

---

## 🔄 Flujo de Datos

### Importación de Plan
```
Usuario → FeedingPlanUpload → feedingPlanService.import() 
→ POST /api/feeding-plans/import → FeedingPlansService.import() 
→ Prisma.create() → Base de datos
```

### Asignación de Plan
```
Usuario → Modal Asignar → feedingPlanService.assignToPlant() 
→ POST /api/plants/:id/feeding-plan → FeedingPlansService.assignToPlant() 
→ Prisma.create(PlantFeedingPlan) → Base de datos
```

### Registro de Riego con Plan
```
Usuario → PlantEventModal (con feedingPlanInfo) 
→ Pre-llena formulario con valores del plan 
→ Usuario ajusta valores 
→ eventService.createWaterEvent({ nutrients, notes, ... }) 
→ POST /api/events/water → EventsService.createWaterEvent() 
→ Prisma.create(Event) con data.nutrients y data.notes
```

### Visualización de Historial
```
GET /api/events?plantId=X → EventsService.findAll() 
→ Prisma.findMany() → Retorna eventos con data.nutrients y data.notes 
→ Frontend renderiza badges y notas
```

---

## 🐛 Problemas Resueltos

### 1. Error de Tipo en Prisma Json
**Problema:** `Type 'FeedingProductDto[]' is not assignable to type 'InputJsonValue'`

**Solución:** Conversión explícita usando `JSON.parse(JSON.stringify(week.products))` antes de guardar.

### 2. Planes Importados No Aparecían
**Problema:** Los planes importados no se mostraban porque solo se mostraban planes asignados.

**Solución:** Implementación de `loadAvailablePlans()` para mostrar todos los planes disponibles y permitir asignación.

### 3. Badges Vacíos en Historial
**Problema:** Los badges de nutrientes aparecían vacíos.

**Solución:** 
- Inclusión de unidad en la dosis al guardar (`"0.7 g/L"` en lugar de `"0.7"`)
- Manejo robusto de datos faltantes con validación

---

## 📊 Métricas de Cambios

- **Archivos nuevos:** 7
- **Archivos modificados:** 6
- **Líneas de código agregadas:** ~2,500
- **Endpoints nuevos:** 11
- **Componentes nuevos:** 2
- **Tipos TypeScript nuevos:** 8

---

## ✅ Testing Recomendado

1. **Importación de planes:**
   - [ ] Importar plan válido desde JSON
   - [ ] Validar estructura incorrecta
   - [ ] Importar plan con múltiples semanas

2. **Asignación de planes:**
   - [ ] Asignar plan a planta compatible
   - [ ] Validar que no se pueda asignar plan incompatible
   - [ ] Verificar cálculo de semana actual

3. **Registro de riego:**
   - [ ] Pre-llenado correcto de valores del plan
   - [ ] Cálculo automático de totales
   - [ ] Guardado de nutrientes y notas

4. **Historial:**
   - [ ] Visualización completa de datos
   - [ ] Filtrado por planta
   - [ ] Manejo de eventos antiguos sin nutrientes

5. **Eliminación:**
   - [ ] No permitir eliminar plan con plantas asignadas
   - [ ] Eliminar plan sin asignaciones

---

## 📝 Notas Técnicas

- Los campos `Json` de Prisma requieren conversión explícita en TypeScript
- La semana actual se calcula como `floor(días_transcurridos / 7) + 1`
- Los nutrientes se guardan con formato `"dosis unidad"` (ej: `"0.7 g/L"`)
- El sistema soporta múltiples planes por carpa pero un plan por planta por etapa
- La fecha de inicio de etapa (`stageStartDate`) es crítica para el cálculo de semanas





