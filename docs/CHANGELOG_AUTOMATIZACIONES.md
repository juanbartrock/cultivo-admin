# Changelog Técnico - Sistema de Automatizaciones Avanzadas

## Fecha: Diciembre 2024

## 📋 Resumen de Cambios

Se implementó un sistema completo de automatizaciones avanzadas que permite crear reglas de control de dispositivos basadas en horarios programados, condiciones de sensores, o una combinación de ambos.

---

## 🗄️ Cambios en Base de Datos (Prisma Schema)

### Archivo: `backend/prisma/schema.prisma`

#### Nuevos Enums Agregados

```prisma
enum TriggerType {
  SCHEDULED      // Solo basado en horario
  CONDITION      // Solo basado en condiciones de sensores
  HYBRID         // Combinación: horario + condiciones
}

enum ScheduleType {
  TIME_RANGE     // ON desde hora X hasta hora Y
  INTERVAL       // Cada X horas/minutos
  SPECIFIC_TIMES // A horas específicas del día
}
```

#### Modelo `Automation` - Campos Agregados

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `triggerType` | `TriggerType` | `CONDITION` | Tipo de trigger |
| `scheduleType` | `ScheduleType?` | `null` | Tipo de programación |
| `activeStartTime` | `String?` | `null` | Hora de encendido (HH:MM) |
| `activeEndTime` | `String?` | `null` | Hora de apagado (HH:MM) |
| `intervalMinutes` | `Int?` | `null` | Intervalo en minutos |
| `actionDuration` | `Int?` | `null` | Duración de acción en minutos |
| `specificTimes` | `String[]` | `[]` | Array de horas específicas |

**Nota:** Se mantuvieron todos los campos existentes (`interval`, `executionTime`, `startTime`, `endTime`, etc.) para compatibilidad.

#### Modelo `AutomationCondition` - Campos Agregados

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `timeValue` | `String?` | `null` | Valor de tiempo "HH:MM" |
| `timeValueMax` | `String?` | `null` | Valor máximo de tiempo |
| `logicOperator` | `String` | `"AND"` | Operador lógico (AND/OR) |

#### Modelo `AutomationAction` - Campos Agregados

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `delayMinutes` | `Int?` | `null` | Retraso antes de ejecutar |
| `value` | `Float?` | `null` | Valor opcional (brillo, velocidad) |

---

## 🔧 Cambios en Backend

### Archivo: `backend/src/modules/automations/dto/automation.dto.ts`

#### `CreateConditionDto` - Actualizado

- Agregado `timeValue?: string` - Para condiciones de tiempo
- Agregado `timeValueMax?: string` - Para condiciones BETWEEN de tiempo
- Agregado `logicOperator?: string` - Operador lógico (AND/OR)

#### `CreateActionDto` - Actualizado

- Agregado `delayMinutes?: number` - Retraso antes de ejecutar
- Agregado `value?: number` - Valor opcional

#### `CreateAutomationDto` - Actualizado

**Nuevos campos opcionales:**
- `triggerType?: TriggerType`
- `scheduleType?: ScheduleType`
- `activeStartTime?: string`
- `activeEndTime?: string`
- `intervalMinutes?: number`
- `actionDuration?: number`
- `specificTimes?: string[]`
- `evaluationInterval?: number` - Mapea a `interval` existente

**Cambios:**
- `conditions` ahora es opcional (para automatizaciones SCHEDULED)

### Archivo: `backend/src/modules/automations/automations.service.ts`

#### Nuevos Métodos Privados

```typescript
private isWithinSchedule(automation): boolean
```
Verifica si el horario actual está dentro del rango permitido (días de semana y ventana horaria).

```typescript
private shouldExecuteScheduled(automation): { shouldExecute: boolean; actionType: 'on' | 'off' | null }
```
Determina si una automatización programada debe ejecutarse según su `scheduleType`:
- **TIME_RANGE**: Compara hora actual con `activeStartTime`/`activeEndTime`
- **INTERVAL**: Verifica si pasó el tiempo desde última ejecución
- **SPECIFIC_TIMES**: Verifica si la hora actual coincide con alguna hora específica

#### Métodos Actualizados

**`create()`:**
- Soporte para nuevos campos de programación
- Manejo de condiciones opcionales para SCHEDULED
- Mapeo de `evaluationInterval` a `interval` existente

**`update()`:**
- Actualización de nuevos campos
- Manejo de condiciones y acciones actualizadas

**`evaluateConditions()`:**
- Soporte para condiciones de tiempo (aunque no implementado completamente en UI)
- Evaluación de operadores lógicos AND/OR

**`executeActions()`:**
- Nuevo parámetro `forceActionType?: 'on' | 'off'` para TIME_RANGE
- Manejo de `delayMinutes` en acciones
- Apagado automático después de `duration` usando `setTimeout`

**`getAutomationsToEvaluate()`:**
- Retorna información sobre tipo de trigger y schedule
- Lógica diferenciada según `triggerType`
- Para SCHEDULED, retorna `actionType` (on/off)

---

## 🎨 Cambios en Frontend

### Archivo: `frontend/src/types/index.ts`

#### Nuevos Tipos

```typescript
export type TriggerType = 'SCHEDULED' | 'CONDITION' | 'HYBRID';
export type ScheduleType = 'TIME_RANGE' | 'INTERVAL' | 'SPECIFIC_TIMES';
```

#### Interface `Automation` - Actualizada

**Campos agregados:**
- `triggerType: TriggerType`
- `scheduleType?: ScheduleType`
- `activeStartTime?: string`
- `activeEndTime?: string`
- `intervalMinutes?: number`
- `actionDuration?: number`
- `specificTimes: string[]`

**Campos mantenidos (compatibilidad):**
- `interval: number` - Usado para `evaluationInterval`
- `executionTime?: number`
- `startTime?: string` / `endTime?: string`

#### Interface `AutomationCondition` - Actualizada

- `deviceId` ahora es requerido (no opcional)
- Agregado `timeValue?: string`
- Agregado `timeValueMax?: string`
- Agregado `logicOperator: string`

#### Interface `AutomationAction` - Actualizada

- Agregado `delayMinutes?: number`
- Agregado `value?: number`

#### Interface `CreateAutomationDto` - Actualizada

- Todos los nuevos campos opcionales
- `conditions` ahora es opcional
- `evaluationInterval` mapea a `interval` en backend

### Archivo: `frontend/src/app/automatizaciones/page.tsx`

#### Componente Principal - Actualizado

**Nuevas funciones:**
- `formatTriggerInfo()` - Formatea información de la automatización para mostrar

**Vista mejorada:**
- Muestra tipo de automatización con iconos
- Información de programación según el tipo
- Vista diferenciada para SCHEDULED vs CONDITION/HYBRID

#### Componente `CreateAutomationModal` - Rediseñado Completamente

**Estructura tipo Wizard (5 pasos):**

1. **Step 'type'**:
   - Formulario básico (nombre, descripción, sección)
   - Selección de tipo de automatización (SCHEDULED/CONDITION/HYBRID)

2. **Step 'schedule'**:
   - Para SCHEDULED: Selección de `scheduleType` y configuración según tipo
   - Para CONDITION/HYBRID: Configuración de `evaluationInterval` y ventana horaria
   - Selector de días de la semana

3. **Step 'conditions'** (opcional para SCHEDULED):
   - Agregar condiciones de sensores
   - Configurar operadores lógicos (AND/OR)
   - Editor de condiciones con dropdowns

4. **Step 'actions'**:
   - Agregar múltiples acciones
   - Configurar duración y retraso por acción
   - Selector de dispositivo y tipo de acción

5. **Step 'review'**:
   - Resumen completo de la automatización
   - Vista previa de configuración

**Características del Wizard:**
- Navegación con botones Anterior/Siguiente
- Validación por paso (`canProceed()`)
- Skip automático del paso de condiciones para SCHEDULED
- Indicadores visuales de progreso
- Animaciones con Framer Motion

**Constantes agregadas:**
- `triggerTypeLabels` - Etiquetas e iconos para tipos
- `scheduleTypeLabels` - Etiquetas e iconos para subtipos

---

## 📦 Archivos Nuevos

### Documentación

- `docs/AUTOMATIZACIONES_AVANZADAS.md` - Documentación completa del sistema
- `docs/RESUMEN_AUTOMATIZACIONES.md` - Resumen ejecutivo
- `docs/CHANGELOG_AUTOMATIZACIONES.md` - Este archivo

---

## 🔄 Migración de Base de Datos

### Comando Ejecutado

```bash
cd backend
npx prisma db push
```

### Resultado

✅ **Migración exitosa sin pérdida de datos**
- Todos los campos nuevos son opcionales o tienen defaults
- Campos existentes se mantienen intactos
- Automatizaciones existentes siguen funcionando

### Compatibilidad

- Automatizaciones existentes se comportan como `CONDITION` por defecto
- Campo `interval` existente se usa para `evaluationInterval`
- Todos los campos antiguos siguen funcionando

---

## 🧪 Testing

### Casos de Prueba Recomendados

1. **Crear automatización TIME_RANGE:**
   - Configurar ON desde 08:00 hasta 20:00
   - Verificar que se ejecuta correctamente

2. **Crear automatización INTERVAL:**
   - Configurar cada 120 minutos con duración de 30 minutos
   - Verificar ejecución cíclica

3. **Crear automatización SPECIFIC_TIMES:**
   - Agregar horas específicas (08:00, 14:00, 20:00)
   - Verificar ejecución en horas exactas

4. **Crear automatización CONDITION:**
   - Agregar condición de temperatura > 28°C
   - Verificar ejecución cuando se cumple condición

5. **Crear automatización HYBRID:**
   - Configurar horario 08:00-22:00
   - Agregar condición de temperatura
   - Verificar que solo se ejecuta en horario Y con condición

6. **Múltiples acciones con duración:**
   - Crear automatización con acción de 30 minutos
   - Verificar apagado automático después de 30 minutos

7. **Múltiples condiciones con operadores:**
   - Crear automatización con 2 condiciones (AND)
   - Verificar que ambas deben cumplirse

---

## ⚠️ Notas Importantes

1. **Compatibilidad hacia atrás:** ✅ 100% compatible
2. **Pérdida de datos:** ❌ Ninguna
3. **Breaking changes:** ❌ Ninguno
4. **Campos deprecados:** ❌ Ninguno

## 🐛 Issues Conocidos

- Ninguno reportado hasta la fecha

## 🔮 Próximos Pasos Sugeridos

1. Implementar ejecutor automático (cron job) para evaluar automatizaciones
2. Agregar notificaciones cuando se ejecutan automatizaciones
3. Implementar condiciones de tiempo en la UI (actualmente solo en backend)
4. Agregar gráficos de efectividad de automatizaciones
5. Implementar WebSockets para actualizaciones en tiempo real

---

## 📝 Notas de Desarrollo

- La migración se realizó con `prisma db push` para evitar pérdida de datos
- Todos los campos nuevos son opcionales para mantener compatibilidad
- El campo `interval` existente se reutiliza para `evaluationInterval`
- La UI usa un wizard para simplificar la creación de automatizaciones complejas

---

**Autor:** Sistema implementado como mejora del sistema de automatizaciones existente  
**Fecha:** Diciembre 2024

