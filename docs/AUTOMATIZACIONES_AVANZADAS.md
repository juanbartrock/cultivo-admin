# Sistema de Automatizaciones Avanzadas

## 📋 Resumen

Se ha implementado un sistema completo de automatizaciones que permite crear reglas de control de dispositivos basadas en:
- **Horarios programados** (sin necesidad de sensores)
- **Condiciones de sensores** (sistema original)
- **Combinación de ambos** (híbrido)

## 🎯 Funcionalidades Implementadas

### Tipos de Automatización

#### 1. **SCHEDULED** - Programada por Horario
Automatizaciones que se ejecutan únicamente basadas en horarios, sin necesidad de condiciones de sensores.

**Subtipos:**

- **TIME_RANGE** - Rango horario
  - Encender dispositivo desde hora X hasta hora Y
  - Ejemplo: Luz encendida de 06:00 a 24:00
  - Se apaga automáticamente al llegar a la hora de fin

- **INTERVAL** - Intervalo cíclico
  - Repetir cada X minutos/horas
  - Con duración específica de encendido
  - Ejemplo: Riego cada 4 horas, encendido por 15 minutos

- **SPECIFIC_TIMES** - Horas específicas
  - Ejecutar a horas exactas del día
  - Ejemplo: Encender a las 08:00, 14:00 y 20:00

#### 2. **CONDITION** - Por Condición
Sistema original basado en condiciones de sensores (temperatura, humedad, estado).

#### 3. **HYBRID** - Híbrida
Combina horarios con condiciones de sensores. Solo se ejecuta cuando:
- Está dentro del horario permitido
- Y se cumplen todas las condiciones de sensores

### Características Adicionales

- ✅ **Múltiples condiciones** con operadores lógicos (AND/OR)
- ✅ **Múltiples acciones** por automatización
- ✅ **Duración de acciones** (encender por X minutos y apagar automáticamente)
- ✅ **Retraso de acciones** (esperar X minutos antes de ejecutar)
- ✅ **Días de la semana** configurables (vacío = todos los días)
- ✅ **Ventana de evaluación** (horario desde/hasta para evaluar condiciones)

## 📊 Cambios en la Base de Datos

### Nuevos Enums

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

### Campos Agregados a `Automation`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `triggerType` | `TriggerType` | Tipo de trigger (default: CONDITION) |
| `scheduleType` | `ScheduleType?` | Tipo de programación (solo para SCHEDULED) |
| `activeStartTime` | `String?` | Hora de encendido (para TIME_RANGE) |
| `activeEndTime` | `String?` | Hora de apagado (para TIME_RANGE) |
| `intervalMinutes` | `Int?` | Intervalo en minutos (para INTERVAL) |
| `actionDuration` | `Int?` | Duración de la acción en minutos |
| `specificTimes` | `String[]` | Array de horas específicas (para SPECIFIC_TIMES) |

**Nota:** Se mantuvieron todos los campos existentes (`interval`, `executionTime`, `startTime`, `endTime`, etc.) para compatibilidad con automatizaciones anteriores.

### Campos Agregados a `AutomationCondition`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `timeValue` | `String?` | Valor de tiempo "HH:MM" para condiciones de tiempo |
| `timeValueMax` | `String?` | Valor máximo de tiempo para BETWEEN |
| `logicOperator` | `String` | Operador lógico con siguiente condición (AND/OR, default: AND) |

### Campos Agregados a `AutomationAction`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `delayMinutes` | `Int?` | Retraso antes de ejecutar esta acción |
| `value` | `Float?` | Valor opcional (brillo, velocidad, etc.) |

## 🔧 Cambios en el Backend

### Servicio de Automatizaciones (`automations.service.ts`)

#### Nuevos Métodos

- `isWithinSchedule()` - Verifica si el horario actual está dentro del rango permitido
- `shouldExecuteScheduled()` - Determina si una automatización programada debe ejecutarse
- `evaluateConditions()` - Mejorado para soportar condiciones de tiempo

#### Lógica de Ejecución

**Para automatizaciones SCHEDULED:**
1. Verifica día de la semana
2. Según `scheduleType`:
   - **TIME_RANGE**: Compara hora actual con `activeStartTime`/`activeEndTime`
   - **INTERVAL**: Verifica si pasó el tiempo desde última ejecución
   - **SPECIFIC_TIMES**: Verifica si la hora actual coincide con alguna hora específica
3. Ejecuta acciones con el tipo correcto (ON u OFF)

**Para automatizaciones CONDITION/HYBRID:**
1. Verifica horario permitido (`startTime`/`endTime`)
2. Evalúa condiciones de sensores
3. Ejecuta acciones si todas las condiciones se cumplen

### DTOs Actualizados

**`CreateAutomationDto`:**
- Campos opcionales para configuración de programación
- `conditions` ahora es opcional (para SCHEDULED)
- Nuevos campos para `scheduleType`, `activeStartTime`, `activeEndTime`, etc.

**`CreateConditionDto`:**
- Soporte para condiciones de tiempo (`timeValue`, `timeValueMax`)
- Operador lógico (`logicOperator`)

**`CreateActionDto`:**
- `delayMinutes` para retraso de ejecución
- `value` para valores opcionales

## 🎨 Cambios en el Frontend

### Nueva UI - Modal Wizard

El modal de creación ahora es un **wizard de 5 pasos**:

1. **Tipo** - Seleccionar tipo de automatización y datos básicos
2. **Programación** - Configurar horarios según el tipo seleccionado
3. **Condiciones** - Agregar condiciones de sensores (opcional para SCHEDULED)
4. **Acciones** - Configurar acciones a ejecutar
5. **Revisar** - Resumen antes de crear

### Componentes Actualizados

**`frontend/src/app/automatizaciones/page.tsx`:**
- Nueva función `formatTriggerInfo()` para mostrar información de la automatización
- Vista mejorada de detalles con información de programación
- Soporte para mostrar diferentes tipos de automatización

**Tipos TypeScript (`frontend/src/types/index.ts`):**
- Nuevos tipos: `TriggerType`, `ScheduleType`
- Interfaces actualizadas con nuevos campos
- Compatibilidad con campos existentes

## 📝 Ejemplos de Uso

### Ejemplo 1: Luz de Crecimiento 18/6

```json
{
  "name": "Luz Vegetativo 18/6",
  "triggerType": "SCHEDULED",
  "scheduleType": "TIME_RANGE",
  "activeStartTime": "06:00",
  "activeEndTime": "24:00",
  "daysOfWeek": [],
  "actions": [
    {
      "deviceId": "luz-id",
      "actionType": "TURN_ON"
    }
  ]
}
```

### Ejemplo 2: Riego Automático Cada 4 Horas

```json
{
  "name": "Riego Automático",
  "triggerType": "SCHEDULED",
  "scheduleType": "INTERVAL",
  "intervalMinutes": 240,
  "actionDuration": 15,
  "actions": [
    {
      "deviceId": "bomba-riego-id",
      "actionType": "TURN_ON",
      "duration": 15
    }
  ]
}
```

### Ejemplo 3: Ventilación por Temperatura y Horario

```json
{
  "name": "Ventilación Inteligente",
  "triggerType": "HYBRID",
  "startTime": "08:00",
  "endTime": "22:00",
  "evaluationInterval": 5,
  "conditions": [
    {
      "deviceId": "sensor-temp-id",
      "property": "temperature",
      "operator": "GREATER_THAN",
      "value": 28,
      "logicOperator": "AND"
    }
  ],
  "actions": [
    {
      "deviceId": "extractor-id",
      "actionType": "TURN_ON",
      "duration": 30
    }
  ]
}
```

### Ejemplo 4: Múltiples Acciones con Retraso

```json
{
  "name": "Secuencia de Riego",
  "triggerType": "SCHEDULED",
  "scheduleType": "SPECIFIC_TIMES",
  "specificTimes": ["08:00", "20:00"],
  "actions": [
    {
      "deviceId": "bomba-nutrientes-id",
      "actionType": "TURN_ON",
      "duration": 5,
      "delayMinutes": 0
    },
    {
      "deviceId": "bomba-agua-id",
      "actionType": "TURN_ON",
      "duration": 10,
      "delayMinutes": 5
    }
  ]
}
```

## 🔄 Migración de Datos

### Compatibilidad con Datos Existentes

✅ **100% compatible** - Todos los campos existentes se mantienen:
- `interval` → Se usa para `evaluationInterval` en automatizaciones CONDITION/HYBRID
- `executionTime` → Se mantiene para compatibilidad
- `startTime`/`endTime` → Ventana de evaluación
- `daysOfWeek` → Funciona igual que antes

### Automatizaciones Existentes

Las automatizaciones creadas antes de esta actualización:
- Mantienen su funcionalidad original
- Se comportan como `CONDITION` por defecto
- Pueden ser editadas para usar nuevas características

## 🚀 Cómo Usar

### Crear una Automatización Programada

1. Ir a `/automatizaciones`
2. Click en "Nueva Automatización"
3. Seleccionar tipo "Programada"
4. Elegir subtipo:
   - **Rango horario**: Definir hora de inicio y fin
   - **Intervalo**: Definir cada cuánto y por cuánto tiempo
   - **Horas específicas**: Agregar horas del día
5. Seleccionar días de la semana (opcional)
6. Agregar acciones (dispositivos a controlar)
7. Revisar y crear

### Crear una Automatización por Condición

1. Seleccionar tipo "Por condición" o "Híbrida"
2. Configurar intervalo de evaluación
3. Agregar condiciones de sensores
4. Configurar operadores lógicos entre condiciones (AND/OR)
5. Agregar acciones
6. Opcionalmente definir ventana horaria de evaluación

## ⚠️ Notas Importantes

1. **Duración de acciones**: Si una acción tiene `duration`, el dispositivo se apagará automáticamente después de ese tiempo
2. **Retraso de acciones**: Las acciones con `delayMinutes` esperarán antes de ejecutarse
3. **Días de la semana**: Array vacío = todos los días (0=Domingo, 6=Sábado)
4. **Horarios**: Formato "HH:MM" en 24 horas
5. **Compatibilidad**: Las automatizaciones existentes siguen funcionando sin cambios

## 🔍 Archivos Modificados

### Backend
- `backend/prisma/schema.prisma` - Nuevos enums y campos
- `backend/src/modules/automations/dto/automation.dto.ts` - DTOs actualizados
- `backend/src/modules/automations/automations.service.ts` - Lógica de ejecución mejorada

### Frontend
- `frontend/src/types/index.ts` - Nuevos tipos TypeScript
- `frontend/src/app/automatizaciones/page.tsx` - UI completa rediseñada
- `frontend/src/services/automationService.ts` - Sin cambios (compatible)

## 📅 Fecha de Implementación

**Diciembre 2024**

## 👤 Autor

Sistema implementado como mejora del sistema de automatizaciones existente.

---

**Nota:** Esta documentación describe los cambios realizados. Para más detalles sobre el uso del sistema, consulta la interfaz de usuario en `/automatizaciones`.


