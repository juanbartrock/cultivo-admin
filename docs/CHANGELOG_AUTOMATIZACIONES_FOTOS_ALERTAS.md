# Changelog Técnico - Automatizaciones de Fotos y Control de Alertas

## Fecha: Diciembre 2024

## 📋 Resumen de Cambios

Se implementaron mejoras al sistema de automatizaciones que permiten:
1. **Automatización de captura de fotos periódicas** con registro automático en el historial de plantas asociadas
2. **Control de alertas/notificaciones** al crear o editar automatizaciones
3. **Paginación del historial de ejecuciones** (5 ejecuciones por página)
4. **Migración de base de datos** para soportar plantas asociadas a automatizaciones

---

## 🗄️ Cambios en Base de Datos (Prisma Schema)

### Archivo: `backend/prisma/schema.prisma`

#### Modelo `Automation` - Campo Agregado

```prisma
model Automation {
  // ... campos existentes
  
  // Plantas asociadas (para automatizaciones de fotos)
  plantIds String[] @default([]) @map("plant_ids") // IDs de plantas para registrar eventos
  
  // ... otros campos
}
```

**Descripción:**
- Campo `plantIds` agregado como array de strings
- Valor por defecto: array vacío `[]`
- Permite asociar múltiples plantas a una automatización
- Usado principalmente para automatizaciones de tipo `CAPTURE_PHOTO`

**Migración ejecutada:**
```bash
cd backend
npx prisma db push
```

**Resultado:** ✅ Migración exitosa sin pérdida de datos
- Campo agregado con valor por defecto vacío
- Todas las automatizaciones existentes mantienen `plantIds: []`
- Compatibilidad 100% hacia atrás

---

## 🔧 Cambios en Backend

### Archivo: `backend/src/modules/automations/dto/automation.dto.ts`

#### `CreateAutomationDto` - Campo Agregado

```typescript
@IsOptional()
@IsArray()
@IsString({ each: true })
plantIds?: string[];
```

**Descripción:**
- Campo opcional para recibir IDs de plantas al crear automatizaciones
- Validación: debe ser un array de strings si se proporciona

#### `UpdateAutomationDto` - Campo Agregado

```typescript
@IsOptional()
@IsArray()
@IsString({ each: true })
plantIds?: string[];
```

**Descripción:**
- Campo opcional para actualizar plantas asociadas a automatizaciones existentes

### Archivo: `backend/src/modules/automations/automations.service.ts`

#### Método `create()` - Actualizado

**Validación agregada:**
```typescript
// Validar que todas las plantas existan
if (data.plantIds && data.plantIds.length > 0) {
  const existingPlants = await this.prisma.plant.findMany({
    where: { id: { in: data.plantIds } },
  });
  
  if (existingPlants.length !== data.plantIds.length) {
    throw new BadRequestException('Una o más plantas no existen');
  }
}
```

**Inclusión en creación:**
```typescript
plantIds: data.plantIds || [],
```

#### Método `update()` - Actualizado

**Actualización condicional:**
```typescript
...(data.plantIds !== undefined && { plantIds: data.plantIds }),
```

#### Método `executeActions()` - Actualizado

**Nuevo caso para `ActionType.CAPTURE_PHOTO`:**

```typescript
case ActionType.CAPTURE_PHOTO:
  const snapshotResult = await this.devicesService.captureSnapshot(action.deviceId);
  
  if (snapshotResult.success && snapshotResult.downloadUrl) {
    // Si hay plantas asociadas, registrar evento de foto para cada una
    if (automation.plantIds && automation.plantIds.length > 0) {
      for (const plantId of automation.plantIds) {
        const plant = await this.prisma.plant.findUnique({
          where: { id: plantId },
          select: { id: true, cycleId: true, sectionId: true },
        });
        
        if (plant) {
          await this.prisma.event.create({
            data: {
              type: EventType.FOTO,
              plantId: plant.id,
              cycleId: plant.cycleId,
              sectionId: plant.sectionId,
              data: {
                url: snapshotResult.downloadUrl,
                filename: snapshotResult.filename,
                automationId: automation.id,
                automationName: automation.name,
                capturedAt: new Date().toISOString(),
              },
            },
          });
        }
      }
    }
  }
  break;
```

**Funcionalidad:**
- Captura snapshot usando `devicesService.captureSnapshot()`
- Si la captura es exitosa y hay plantas asociadas:
  - Obtiene información de cada planta (id, cycleId, sectionId)
  - Crea un evento `EventType.FOTO` para cada planta asociada
  - Incluye metadata: URL de la foto, nombre del archivo, ID y nombre de la automatización, timestamp

**Importaciones agregadas:**
```typescript
import { EventType } from '@prisma/client';
```

---

## 🎨 Cambios en Frontend

### Archivo: `frontend/src/types/index.ts`

#### Interface `Automation` - Campo Agregado

```typescript
export interface Automation {
  // ... campos existentes
  plantIds: string[]; // IDs de plantas asociadas (para fotos)
  // ... otros campos
}
```

#### Interface `CreateAutomationDto` - Campo Agregado

```typescript
export interface CreateAutomationDto {
  // ... campos existentes
  plantIds?: string[]; // IDs de plantas para registrar eventos de foto
  // ... otros campos
}
```

### Archivo: `frontend/src/app/automatizaciones/page.tsx`

#### Componente Principal - Actualizado

**Nuevos estados:**
```typescript
const [automationPlants, setAutomationPlants] = useState<Plant[]>([]);
const [executionsPage, setExecutionsPage] = useState(1);
const executionsPerPage = 5;
```

**Función `loadAutomationDetails()` - Actualizada:**

```typescript
async function loadAutomationDetails(id: string) {
  setIsLoadingDetails(true);
  try {
    const [executionsData, effectivenessData] = await Promise.all([
      automationService.getExecutions(id, { limit: 50 }),
      automationService.getEffectiveness(id, 30),
    ]);
    setExecutions(executionsData);
    setEffectiveness(effectivenessData);
    setExecutionsPage(1); // Resetear a la primera página
    
    // Cargar plantas asociadas si existen
    if (selectedAutomation?.plantIds && selectedAutomation.plantIds.length > 0) {
      try {
        const plantsData = await Promise.all(
          selectedAutomation.plantIds.map(plantId => plantService.getById(plantId))
        );
        setAutomationPlants(plantsData);
      } catch (err) {
        console.error('Error loading automation plants:', err);
        setAutomationPlants([]);
      }
    } else {
      setAutomationPlants([]);
    }
  } catch (err) {
    console.error('Error loading automation details:', err);
  } finally {
    setIsLoadingDetails(false);
  }
}
```

**Vista de detalles - Sección "Plantas asociadas":**

```typescript
{/* Plantas asociadas (si hay acción CAPTURE_PHOTO) */}
{selectedAutomation.actions.some(a => a.actionType === 'CAPTURE_PHOTO') && 
 selectedAutomation.plantIds && selectedAutomation.plantIds.length > 0 && (
  <div className="mt-4">
    <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
      <Camera className="w-4 h-4 text-cyan-400" />
      Plantas asociadas ({selectedAutomation.plantIds.length})
    </h3>
    {automationPlants.length > 0 ? (
      <div className="space-y-1">
        {automationPlants.map((plant) => (
          <div key={plant.id} className="flex items-center gap-2 text-sm">
            <span className="text-zinc-300">
              {plant.tagCode}
              {plant.strain && (
                <span className="text-zinc-500 ml-2">({plant.strain.name})</span>
              )}
            </span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-zinc-500">Cargando plantas...</p>
    )}
  </div>
)}
```

**Historial de ejecuciones - Paginación:**

```typescript
{/* Ejecuciones paginadas */}
<div className="space-y-2">
  {executions
    .slice((executionsPage - 1) * executionsPerPage, executionsPage * executionsPerPage)
    .map((execution) => {
      // ... renderizado de ejecución
    })}
</div>

{/* Controles de paginación */}
{executions.length > executionsPerPage && (
  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700/50">
    <p className="text-sm text-zinc-400">
      Mostrando {((executionsPage - 1) * executionsPerPage) + 1} - {Math.min(executionsPage * executionsPerPage, executions.length)} de {executions.length}
    </p>
    <div className="flex items-center gap-2">
      <button
        onClick={() => setExecutionsPage(prev => Math.max(1, prev - 1))}
        disabled={executionsPage === 1}
        className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 rounded-lg transition-colors"
        title="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-zinc-400 px-2">
        {executionsPage} / {Math.ceil(executions.length / executionsPerPage)}
      </span>
      <button
        onClick={() => setExecutionsPage(prev => Math.min(Math.ceil(executions.length / executionsPerPage), prev + 1))}
        disabled={executionsPage >= Math.ceil(executions.length / executionsPerPage)}
        className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 rounded-lg transition-colors"
        title="Página siguiente"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}
```

**Renderizado de acciones - Icono de cámara:**

```typescript
{action.actionType === 'CAPTURE_PHOTO' ? (
  <Camera className="w-3.5 h-3.5 text-purple-400" />
) : (
  <Power className="w-3.5 h-3.5 text-purple-400" />
)}
```

#### Componente `CreateAutomationModal` - Actualizado

**Estado del formulario - Campo agregado:**

```typescript
const [form, setForm] = useState({
  // ... campos existentes
  notifications: true, // Control de alertas
  // ... otros campos
});
```

**Nuevos estados:**

```typescript
const [plants, setPlants] = useState<Plant[]>([]);
const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);
```

**useEffect para cargar plantas:**

```typescript
// Cargar plantas cuando cambia la sección
useEffect(() => {
  if (form.sectionId) {
    plantService.getAll({ sectionId: form.sectionId })
      .then(setPlants)
      .catch(err => {
        console.error('Error loading plants:', err);
        setPlants([]);
      });
  } else {
    setPlants([]);
  }
  setSelectedPlantIds([]); // Resetear selección al cambiar sección
}, [form.sectionId]);
```

**Filtro de dispositivos - Actualizado:**

```typescript
const controllableDevices = devices.filter(d => 
  ['LUZ', 'EXTRACTOR', 'VENTILADOR', 'HUMIDIFICADOR', 'DESHUMIDIFICADOR', 
   'BOMBA_RIEGO', 'CALEFACTOR', 'AIRE_ACONDICIONADO', 'CAMARA'].includes(d.type)
);
```

**Etiquetas de acciones - Actualizado:**

```typescript
const actionLabels: Record<ActionType, string> = {
  TURN_ON: 'Encender',
  TURN_OFF: 'Apagar',
  TOGGLE: 'Alternar',
  CAPTURE_PHOTO: 'Capturar foto', // Agregado
  TRIGGER_IRRIGATION: 'Activar riego',
};
```

**Step 1: Type - Toggle de alertas:**

```typescript
{/* Toggle de alertas */}
<div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
  <div className="flex items-center gap-3">
    <AlertTriangle className="w-5 h-5 text-yellow-400" />
    <div>
      <label className="block text-sm font-medium text-zinc-300">Enviar alertas</label>
      <p className="text-xs text-zinc-500">Recibir notificaciones cuando se ejecute esta automatización</p>
    </div>
  </div>
  <button
    type="button"
    onClick={() => setForm({ ...form, notifications: !form.notifications })}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      form.notifications ? 'bg-purple-600' : 'bg-zinc-700'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        form.notifications ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
</div>
```

**Step 4: Actions - Selector de plantas:**

```typescript
{/* Selector de plantas para acciones CAPTURE_PHOTO */}
{actions.some(a => a.actionType === 'CAPTURE_PHOTO') && (
  <div className="mt-6 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
    <div className="flex items-center gap-2 mb-3">
      <Camera className="w-5 h-5 text-cyan-400" />
      <label className="text-sm font-medium text-zinc-300">
        Plantas asociadas (opcional)
      </label>
    </div>
    <p className="text-xs text-zinc-500 mb-3">
      Selecciona las plantas para registrar las fotos en su historial. Deja vacío para no registrar en ninguna planta.
    </p>
    
    {plants.length === 0 ? (
      <p className="text-sm text-zinc-500 text-center py-4">
        No hay plantas en esta sección
      </p>
    ) : (
      <div className="space-y-2 max-h-48 overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => {
              if (selectedPlantIds.length === plants.length) {
                setSelectedPlantIds([]);
              } else {
                setSelectedPlantIds(plants.map(p => p.id));
              }
            }}
            className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30"
          >
            {selectedPlantIds.length === plants.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
          </button>
        </div>
        {plants.map((plant) => {
          const isSelected = selectedPlantIds.includes(plant.id);
          return (
            <label
              key={plant.id}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-purple-600/20 border border-purple-600/50'
                  : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedPlantIds([...selectedPlantIds, plant.id]);
                  } else {
                    setSelectedPlantIds(selectedPlantIds.filter(id => id !== plant.id));
                  }
                }}
                className="w-4 h-4 text-purple-600 bg-zinc-800 border-zinc-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-zinc-300 flex-1">
                {plant.tagCode}
                {plant.strain && (
                  <span className="text-xs text-zinc-500 ml-2">
                    ({plant.strain.name})
                  </span>
                )}
              </span>
              {isSelected && (
                <CheckSquare className="w-4 h-4 text-purple-400" />
              )}
            </label>
          );
        })}
      </div>
    )}
  </div>
)}
```

**handleSubmit() - Actualizado:**

```typescript
const data: CreateAutomationDto = {
  // ... campos existentes
  notifications: form.notifications,
  plantIds: selectedPlantIds.length > 0 ? selectedPlantIds : undefined,
  // ... otros campos
};
```

**Step 5: Review - Resumen de alertas y plantas:**

```typescript
{/* Notifications summary */}
<div className="p-4 bg-zinc-800/30 rounded-xl">
  <h4 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
    <AlertTriangle className="w-4 h-4 text-yellow-400" />
    Alertas
  </h4>
  <p className="text-sm text-zinc-400">
    {form.notifications ? (
      <span className="text-green-400">✓ Las alertas están activadas</span>
    ) : (
      <span className="text-zinc-500">✗ Las alertas están desactivadas</span>
    )}
  </p>
</div>

{/* Plants summary (si hay acción CAPTURE_PHOTO) */}
{actions.some(a => a.actionType === 'CAPTURE_PHOTO') && (
  <div className="p-4 bg-zinc-800/30 rounded-xl">
    <h4 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
      <Camera className="w-4 h-4 text-cyan-400" />
      Plantas asociadas
    </h4>
    {selectedPlantIds.length > 0 ? (
      <div className="space-y-1">
        {selectedPlantIds.map(plantId => {
          const plant = plants.find(p => p.id === plantId);
          return plant ? (
            <p key={plantId} className="text-sm text-zinc-400">
              • {plant.tagCode}
              {plant.strain && (
                <span className="text-zinc-500 ml-2">({plant.strain.name})</span>
              )}
            </p>
          ) : null;
        })}
      </div>
    ) : (
      <p className="text-sm text-zinc-500">No se registrarán fotos en el historial de plantas</p>
    )}
  </div>
)}
```

#### Componente `EditAutomationModal` - Actualizado

**Estado del formulario:**

```typescript
const [form, setForm] = useState({
  name: automation.name,
  description: automation.description || '',
  notifications: automation.notifications,
});
```

**Toggle de alertas:**

```typescript
{/* Toggle de alertas */}
<div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
  <div className="flex items-center gap-3">
    <AlertTriangle className="w-5 h-5 text-yellow-400" />
    <div>
      <label className="block text-sm font-medium text-zinc-300">Enviar alertas</label>
      <p className="text-xs text-zinc-500">Recibir notificaciones cuando se ejecute esta automatización</p>
    </div>
  </div>
  <button
    type="button"
    onClick={() => setForm({ ...form, notifications: !form.notifications })}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      form.notifications ? 'bg-purple-600' : 'bg-zinc-700'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        form.notifications ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
</div>
```

**handleSubmit() - Actualizado:**

```typescript
await onUpdated({
  name: form.name,
  description: form.description || undefined,
  notifications: form.notifications,
});
```

---

## 📦 Archivos Modificados

### Backend
- `backend/prisma/schema.prisma` - Campo `plantIds` agregado al modelo `Automation`
- `backend/src/modules/automations/dto/automation.dto.ts` - Campo `plantIds` agregado a DTOs
- `backend/src/modules/automations/automations.service.ts` - Lógica de captura de fotos y registro de eventos

### Frontend
- `frontend/src/types/index.ts` - Campo `plantIds` agregado a interfaces
- `frontend/src/app/automatizaciones/page.tsx` - Selector de plantas, control de alertas, paginación, visualización de plantas asociadas

---

## 🧪 Testing

### Casos de Prueba Recomendados

1. **Crear automatización de fotos con plantas asociadas:**
   - Seleccionar dispositivo tipo CÁMARA
   - Agregar acción "Capturar foto"
   - Seleccionar una o más plantas en el selector
   - Verificar que al ejecutarse, se crean eventos de foto para cada planta

2. **Crear automatización de fotos sin plantas:**
   - Seleccionar dispositivo tipo CÁMARA
   - Agregar acción "Capturar foto"
   - No seleccionar plantas
   - Verificar que se captura la foto pero no se registra en historial de plantas

3. **Control de alertas:**
   - Crear automatización con alertas activadas
   - Verificar que `notifications: true` en la base de datos
   - Editar automatización y desactivar alertas
   - Verificar que `notifications: false` en la base de datos

4. **Paginación del historial:**
   - Crear automatización con más de 5 ejecuciones
   - Verificar que solo se muestran 5 ejecuciones por página
   - Navegar entre páginas usando los controles
   - Verificar que el contador muestra correctamente el rango de ejecuciones

5. **Selector de plantas:**
   - Cambiar de sección en el wizard
   - Verificar que las plantas se cargan dinámicamente según la sección
   - Usar "Seleccionar todas" / "Deseleccionar todas"
   - Verificar que la selección se mantiene al navegar entre pasos del wizard

---

## ⚠️ Notas Importantes

1. **Compatibilidad hacia atrás:** ✅ 100% compatible
2. **Pérdida de datos:** ❌ Ninguna
3. **Breaking changes:** ❌ Ninguno
4. **Campos deprecados:** ❌ Ninguno

## 🔮 Próximos Pasos Sugeridos

1. Agregar validación para asegurar que solo se puedan seleccionar plantas de la misma sección que la automatización
2. Implementar vista previa de fotos capturadas en el historial de ejecuciones
3. Agregar filtros adicionales al historial de ejecuciones (por estado, fecha, etc.)
4. Implementar notificaciones push cuando se ejecuten automatizaciones con alertas activadas
5. Agregar opción para seleccionar "Todas las plantas de la sección" en lugar de seleccionar individualmente

---

## 📝 Notas de Desarrollo

- La migración se realizó con `prisma db push` para evitar pérdida de datos
- El campo `plantIds` tiene valor por defecto `[]` para mantener compatibilidad
- Las plantas se cargan dinámicamente según la sección seleccionada en el wizard
- El selector de plantas solo aparece cuando hay una acción `CAPTURE_PHOTO`
- La paginación es del lado del cliente (se cargan 50 ejecuciones y se muestran 5 por página)
- Los eventos de foto se crean con metadata completa incluyendo ID y nombre de la automatización

---

**Autor:** Sistema implementado como mejora del sistema de automatizaciones existente  
**Fecha:** Diciembre 2024
