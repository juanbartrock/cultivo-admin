# Sistema de Planes de Alimentación

## 📋 Descripción General

El sistema de planes de alimentación permite gestionar templates de nutrición para plantas, organizados por semanas y etapas de crecimiento. Estos planes sirven como guía para los riegos y proporcionan valores por defecto al registrar eventos de riego.

## 🎯 Funcionalidades Principales

### 1. Gestión de Planes de Alimentación

- **Importación desde JSON**: Carga planes completos con múltiples semanas desde un archivo JSON
- **Asignación a Plantas**: Asigna planes específicos a plantas individuales dentro de una carpa
- **Múltiples Planes por Carpa**: Soporta diferentes genéticas y etapas con planes independientes
- **Cálculo Automático de Semana**: Calcula la semana actual basándose en la fecha de inicio de la etapa

### 2. Integración con Eventos de Riego

- **Valores por Defecto**: El formulario de riego se pre-llena automáticamente con los valores del plan de la semana actual
- **Cálculo de Totales**: Calcula automáticamente el total de gramos/mililitros basándose en los litros ingresados
- **Selección de Nutrientes**: Permite marcar/desmarcar nutrientes y ajustar dosis individuales
- **Registro Completo**: Guarda pH, EC, litros, nutrientes aplicados y notas del riego

### 3. Visualización en Historial

- **Información Completa**: Muestra pH, EC, litros, nutrientes y notas en el historial de eventos
- **Badges de Nutrientes**: Visualización clara de los nutrientes aplicados en cada riego
- **Filtrado por Planta**: Permite ver el historial específico de una planta

## 🗄️ Estructura de Datos

### Modelos de Base de Datos

#### `FeedingPlan`
Template principal del plan de alimentación.

```prisma
model FeedingPlan {
  id          String             @id @default(uuid())
  name        String             // Ej: "Powder Feeding Vegetativo"
  description String?
  stage       PlantStage         // VEGETATIVO, FLORACION, etc.
  weeks       FeedingPlanWeek[]
  plants      PlantFeedingPlan[]
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
}
```

#### `FeedingPlanWeek`
Detalle de productos y parámetros por semana.

```prisma
model FeedingPlanWeek {
  id            String      @id @default(uuid())
  feedingPlanId String
  weekNumber    Int         // Semana 1, 2, 3...
  products      Json        // [{name: string, dose: string, unit: string}]
  ph            Float?      // pH recomendado
  ec            Float?      // EC recomendada
  notes         String?     // Notas adicionales
}
```

#### `PlantFeedingPlan`
Relación entre planta y plan con fecha de inicio.

```prisma
model PlantFeedingPlan {
  id            String      @id @default(uuid())
  plantId       String
  feedingPlanId String
  stageStartDate DateTime   // Fecha de inicio de la etapa
  createdAt     DateTime    @default(now())
}
```

### Estructura JSON de Importación

```json
{
  "name": "Powder Feeding Vegetativo",
  "stage": "VEGETATIVO",
  "weeks": [
    {
      "weekNumber": 1,
      "ph": 5.8,
      "ec": 1.0,
      "products": [
        {
          "name": "Powder Feeding Grow",
          "dose": "0.7",
          "unit": "g/L"
        },
        {
          "name": "Powder Feeding Calcium",
          "dose": "0.3",
          "unit": "g/L"
        }
      ]
    }
  ]
}
```

## 🔌 API Endpoints

### Planes de Alimentación

#### `GET /api/feeding-plans`
Obtiene todos los planes de alimentación.

**Query Params:**
- `stage` (opcional): Filtrar por etapa (VEGETATIVO, FLORACION, etc.)

**Respuesta:**
```typescript
FeedingPlanWithCount[] // Incluye conteo de plantas asignadas
```

#### `GET /api/feeding-plans/:id`
Obtiene un plan específico por ID.

#### `POST /api/feeding-plans`
Crea un nuevo plan vacío.

**Body:**
```typescript
{
  name: string;
  description?: string;
  stage: PlantStage;
}
```

#### `POST /api/feeding-plans/import`
Importa un plan completo desde JSON.

**Body:**
```typescript
{
  name: string;
  stage: PlantStage;
  weeks: FeedingPlanWeekDto[];
}
```

#### `PUT /api/feeding-plans/:id`
Actualiza un plan existente.

#### `DELETE /api/feeding-plans/:id`
Elimina un plan (solo si no tiene plantas asignadas).

### Planes por Sección

#### `GET /api/sections/:id/feeding-plans`
Obtiene todos los planes asignados a plantas de una sección, con cálculo de semana actual.

**Respuesta:**
```typescript
{
  plants: PlantWithFeedingPlans[];
}
```

Cada planta incluye:
- `feedingPlans`: Array de planes asignados
- `currentWeek`: Semana actual calculada
- `currentWeekData`: Datos de la semana actual (pH, EC, productos)
- `previousWeek`: Datos de la semana anterior
- `nextWeek`: Datos de la semana siguiente

### Asignación de Planes

#### `POST /api/plants/:id/feeding-plan`
Asigna un plan a una planta.

**Body:**
```typescript
{
  feedingPlanId: string;
  stageStartDate: string; // ISO date string
}
```

#### `DELETE /api/plants/:id/feeding-plan/:planId`
Desasigna un plan de una planta.

### Semanas del Plan

#### `POST /api/feeding-plans/:id/weeks`
Agrega o actualiza una semana en un plan.

**Body:**
```typescript
{
  weekNumber: number;
  ph?: number;
  ec?: number;
  products: FeedingProductDto[];
  notes?: string;
}
```

#### `DELETE /api/feeding-plans/:id/weeks/:weekNumber`
Elimina una semana de un plan.

## 🎨 Componentes Frontend

### `FeedingPlanCard`
Componente que muestra la información de un plan asignado a una planta.

**Props:**
```typescript
{
  plantFeedingPlan: PlantFeedingPlan;
}
```

**Características:**
- Muestra semana actual, anterior y siguiente
- Badge de etapa (Vegetativo, Floración, etc.)
- Lista de productos con dosis
- Indicadores de pH y EC

### `FeedingPlanUpload`
Modal para importar planes desde JSON.

**Características:**
- Carga de archivo JSON
- Editor de texto para pegar JSON directamente
- Validación de estructura
- Vista previa antes de importar
- Descarga de ejemplo JSON

### `PlantEventModal` (Modificado)
Modal de registro de eventos con integración de planes.

**Nuevas Características:**
- Pre-llena pH y EC del plan de la semana actual
- Muestra nombre del plan y semana en el header
- Lista de nutrientes con checkboxes
- Cálculo automático de totales (litros × dosis)
- Campo de notas opcionales

**Ejemplo de uso:**
```typescript
<PlantEventModal
  plant={plant}
  sectionId={sectionId}
  feedingPlanInfo={{
    planName: "Powder Feeding Vegetativo",
    currentWeek: 1,
    weekData: {
      ph: 5.8,
      ec: 1.0,
      products: [
        { name: "Powder Feeding Grow", dose: "0.7", unit: "g/L" }
      ]
    }
  }}
  onClose={() => {}}
  onCreated={() => {}}
/>
```

## 📊 Flujo de Trabajo

### 1. Importar Plan de Alimentación

1. Ir a la página de una carpa (`/sala/carpa/[id]`)
2. En la sección "Plan de Alimentación", hacer clic en "Importar primer plan"
3. Pegar el JSON del plan o cargar un archivo
4. Revisar la vista previa
5. Hacer clic en "Importar Plan"

### 2. Asignar Plan a Planta

1. En la sección "Planes disponibles", seleccionar un plan
2. Hacer clic en "Asignar a Planta"
3. Seleccionar la planta compatible
4. Ingresar la fecha de inicio de la etapa
5. Confirmar asignación

### 3. Registrar Evento de Riego

1. Hacer clic en "Evento" en una planta con plan asignado
2. Seleccionar tipo "Riego"
3. El formulario se pre-llena con:
   - pH y EC del plan
   - Lista de nutrientes con dosis
4. Ajustar valores según necesidad:
   - Modificar pH/EC si es necesario
   - Marcar/desmarcar nutrientes
   - Ajustar dosis individuales
   - Ingresar litros (calcula totales automáticamente)
5. Agregar notas opcionales
6. Registrar evento

### 4. Ver Historial

1. Ir a "Seguimientos" (`/seguimientos`)
2. Filtrar por planta (opcional)
3. Ver eventos de riego con:
   - pH, EC, Litros
   - Badges de nutrientes aplicados
   - Notas del riego

## 🔧 Cálculo de Semana Actual

La semana actual se calcula basándose en:

```typescript
const daysSinceStart = Math.floor(
  (new Date().getTime() - new Date(stageStartDate).getTime()) / (1000 * 60 * 60 * 24)
);
const currentWeek = Math.floor(daysSinceStart / 7) + 1;
```

**Ejemplo:**
- Fecha inicio: 1 de diciembre
- Fecha actual: 8 de diciembre
- Días transcurridos: 7
- Semana actual: 2

## 📝 Eventos de Riego

### Estructura de Datos Guardada

```typescript
{
  type: "RIEGO",
  plantId: string,
  cycleId: string,
  sectionId: string,
  data: {
    ph?: number,
    ec?: number,
    liters?: number,
    nutrients?: Array<{
      name: string,
      dose: string  // Incluye unidad: "0.7 g/L"
    }>,
    notes?: string
  }
}
```

### Visualización en Historial

Los eventos de riego se muestran con:

1. **Línea principal**: `pH: 5.8 • EC: 1.0 • 10L`
2. **Badges de nutrientes**: Chips cyan con nombre y dosis
3. **Notas**: Texto en cursiva si existe

## 🚀 Mejoras Futuras Sugeridas

- [ ] Edición de planes existentes desde la UI
- [ ] Duplicación de planes
- [ ] Exportación de planes a JSON
- [ ] Historial de cambios en planes
- [ ] Comparación entre plan y eventos reales
- [ ] Gráficos de seguimiento de pH/EC vs plan
- [ ] Alertas cuando los valores se desvían del plan
- [ ] Plantillas de planes por marca/producto

## 📚 Referencias

- **Backend**: `backend/src/modules/feeding-plans/`
- **Frontend**: `frontend/src/components/FeedingPlanCard.tsx`, `FeedingPlanUpload.tsx`
- **Servicios**: `frontend/src/services/feedingPlanService.ts`
- **Tipos**: `frontend/src/types/index.ts`
- **Schema**: `backend/prisma/schema.prisma`
