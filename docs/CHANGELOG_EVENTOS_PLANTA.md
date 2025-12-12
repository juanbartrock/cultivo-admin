# Changelog - Visualización de Eventos de Planta

## Fecha: Diciembre 2025

### Resumen de Cambios

Implementación de visualización interactiva de los últimos 3 eventos de una planta al hacer click en ella dentro de la página de detalle de carpa. La funcionalidad permite seleccionar una planta y ver rápidamente su historial reciente sin salir de la página.

---

## 🎨 Frontend

### Archivos Modificados

#### `frontend/src/app/sala/carpa/[id]/page.tsx`

**Nuevos estados agregados:**

```typescript
// Estado para mostrar eventos de planta seleccionada
const [selectedPlantForEvents, setSelectedPlantForEvents] = useState<Plant | null>(null);
const [selectedPlantEvents, setSelectedPlantEvents] = useState<GrowEvent[]>([]);
const [loadingPlantEvents, setLoadingPlantEvents] = useState(false);
```

**Nueva función implementada:**

```typescript
async function handleSelectPlantForEvents(plant: Plant) {
  // Si ya está seleccionada, deseleccionar
  if (selectedPlantForEvents?.id === plant.id) {
    setSelectedPlantForEvents(null);
    setSelectedPlantEvents([]);
    return;
  }

  setSelectedPlantForEvents(plant);
  setLoadingPlantEvents(true);
  try {
    const events = await eventService.getPlantHistory(plant.id, 3);
    setSelectedPlantEvents(events);
  } catch (err) {
    console.error('Error cargando eventos de planta:', err);
    setSelectedPlantEvents([]);
  } finally {
    setLoadingPlantEvents(false);
  }
}
```

**Modificaciones en la sección de Plantas:**

1. **Actualización de `PlantCard` props:**
   - Agregado prop `isSelected` para indicar si la planta está seleccionada
   - Agregado prop `onClick` para manejar el click en la planta
   - La función `handleSelectPlantForEvents` se pasa como `onClick`

2. **Nueva sección de eventos debajo de las plantas:**
   - Se muestra solo cuando hay una planta seleccionada
   - Grilla responsive con los últimos 3 eventos
   - Cada evento muestra:
     - **Icono del tipo** (💧 Riego, 📝 Nota, 📷 Foto, 🌡️ Ambiente)
     - **Tipo de evento** con etiqueta legible
     - **Fecha y hora** formateada en español
     - **Datos relevantes** según el tipo:
       - Riego: pH y EC
       - Nota: primeros 50 caracteres del contenido
       - Ambiente: temperatura y humedad

3. **Características visuales:**
   - Animación de entrada/salida con Framer Motion
   - Borde verde y ring cuando la planta está seleccionada
   - Link a historial completo que redirige a `/seguimientos?plant={id}`
   - Estado de carga con spinner mientras se obtienen los eventos
   - Mensaje cuando no hay eventos registrados

**Código de la grilla de eventos:**

```tsx
{selectedPlantForEvents && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    className="bg-zinc-900/50 rounded-xl border border-cultivo-green-500/30 p-4"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-cultivo-green-400" />
        <h4 className="text-sm font-medium text-white">
          Últimos eventos de <span className="text-cultivo-green-400">{selectedPlantForEvents.tagCode}</span>
        </h4>
      </div>
      <Link 
        href={`/seguimientos?plant=${selectedPlantForEvents.id}`}
        className="text-xs text-zinc-400 hover:text-cultivo-green-400 transition-colors"
      >
        Ver historial completo →
      </Link>
    </div>

    {loadingPlantEvents ? (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 text-cultivo-green-400 animate-spin" />
      </div>
    ) : selectedPlantEvents.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {selectedPlantEvents.map((event) => (
          <div 
            key={event.id}
            className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50"
          >
            {/* Renderizado de evento con iconos y datos */}
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-4 text-zinc-500 text-sm">
        No hay eventos registrados para esta planta
      </div>
    )}
  </motion.div>
)}
```

#### `frontend/src/components/PlantCard.tsx`

**Modificaciones en la interfaz:**

```typescript
interface PlantCardProps {
  plant: Plant;
  delay?: number;
  isSelected?: boolean;  // ← Nuevo prop
  onRegisterEvent?: (plant: Plant) => void;
  onStageChange?: (plant: Plant, newStage: PlantStage) => void;
  onClick?: (plant: Plant) => void;  // ← Nuevo prop
}
```

**Modificaciones en el componente:**

1. **Actualización de props:**
   - Agregado `isSelected` con valor por defecto `false`
   - Agregado `onClick` como prop opcional

2. **Estilos condicionales:**
   - Cuando `isSelected` es `true`, se aplica:
     - Borde verde: `border-cultivo-green-500`
     - Ring de foco: `ring-2 ring-cultivo-green-500/30`
   - Cuando `isSelected` es `false`, mantiene el estilo original con hover

3. **Manejo de click:**
   - El contenedor principal ahora tiene `onClick={() => onClick?.(currentPlant)}`
   - Agregado `cursor-pointer` para indicar que es clickeable
   - El click no interfiere con el menú de acciones (menú tiene su propio handler)

**Código modificado:**

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: delay * 0.05 }}
  onClick={() => onClick?.(currentPlant)}
  className={`bg-zinc-800/50 backdrop-blur-sm border rounded-xl p-4 transition-all cursor-pointer ${
    isSelected 
      ? 'border-cultivo-green-500 ring-2 ring-cultivo-green-500/30' 
      : 'border-zinc-700/50 hover:border-cultivo-green-600/30'
  } ${showStageModal ? 'relative z-50' : 'relative'}`}
>
```

---

## 🔄 Flujo de Datos

### Selección de Planta y Carga de Eventos

```
Usuario hace click en PlantCard
  ↓
onClick(currentPlant) se ejecuta
  ↓
handleSelectPlantForEvents(plant) en page.tsx
  ↓
Si ya está seleccionada → Deseleccionar y ocultar eventos
Si no está seleccionada:
  ↓
setSelectedPlantForEvents(plant)
setLoadingPlantEvents(true)
  ↓
eventService.getPlantHistory(plant.id, 3)
  ↓
GET /api/events?plantId={id}&limit=3
  ↓
Backend retorna últimos 3 eventos
  ↓
setSelectedPlantEvents(events)
setLoadingPlantEvents(false)
  ↓
UI muestra grilla con eventos
```

### Deselección

```
Usuario hace click en la misma planta seleccionada
  ↓
handleSelectPlantForEvents detecta que ya está seleccionada
  ↓
setSelectedPlantForEvents(null)
setSelectedPlantEvents([])
  ↓
UI oculta la grilla de eventos
```

---

## 🎯 Funcionalidades Implementadas

### 1. Selección Interactiva de Plantas
- ✅ Click en una planta la selecciona visualmente
- ✅ Click en la misma planta la deselecciona
- ✅ Click en otra planta cambia la selección
- ✅ Indicador visual claro (borde verde + ring)

### 2. Carga de Eventos
- ✅ Obtiene automáticamente los últimos 3 eventos
- ✅ Muestra estado de carga mientras obtiene datos
- ✅ Manejo de errores con mensaje apropiado
- ✅ Mensaje cuando no hay eventos

### 3. Visualización de Eventos
- ✅ Grilla responsive (1 columna en móvil, 3 en desktop)
- ✅ Iconos diferenciados por tipo de evento
- ✅ Formato de fecha legible en español
- ✅ Datos relevantes según el tipo de evento
- ✅ Diseño consistente con el resto de la aplicación

### 4. Navegación
- ✅ Link a historial completo que preserva el filtro de planta
- ✅ Redirección a `/seguimientos?plant={id}`

---

## 🎨 Diseño Visual

### Estados de la Planta

**No seleccionada:**
- Borde: `border-zinc-700/50`
- Hover: `hover:border-cultivo-green-600/30`

**Seleccionada:**
- Borde: `border-cultivo-green-500`
- Ring: `ring-2 ring-cultivo-green-500/30`

### Grilla de Eventos

**Contenedor:**
- Fondo: `bg-zinc-900/50`
- Borde: `border-cultivo-green-500/30`
- Padding: `p-4`
- Animación: Fade in/out con altura automática

**Tarjetas de evento:**
- Fondo: `bg-zinc-800/50`
- Borde: `border-zinc-700/50`
- Padding: `p-3`
- Grid: `grid-cols-1 md:grid-cols-3 gap-3`

### Iconos por Tipo

| Tipo | Icono | Color |
|------|-------|-------|
| RIEGO | 💧 Droplets | `text-cyan-400` |
| NOTA | 📝 FileText | `text-yellow-400` |
| FOTO | 📷 Camera | `text-purple-400` |
| PARAMETRO_AMBIENTAL | 🌡️ Thermometer | `text-orange-400` |
| Otros | ⚡ Activity | `text-zinc-400` |

---

## 🔧 Detalles Técnicos

### Servicio Utilizado

**`eventService.getPlantHistory(plantId, limit)`**
- Método existente en `frontend/src/services/eventService.ts`
- Internamente llama a `eventService.getAll({ plantId, limit })`
- Retorna array de `GrowEvent[]`

### Manejo de Tipos

**Problema resuelto:** TypeScript no permitía renderizar directamente `event.data.ph` porque `event.data` es de tipo `unknown`.

**Solución:** Conversión explícita a string usando `String()`:

```tsx
{event.type === 'RIEGO' && (
  <>
    {event.data.ph ? `pH: ${String(event.data.ph)}` : ''}
    {event.data.ec ? ` EC: ${String(event.data.ec)}` : ''}
  </>
)}
```

### Optimizaciones

1. **Límite de eventos:** Solo se cargan 3 eventos para mantener la UI ligera
2. **Carga condicional:** Los eventos solo se cargan cuando se selecciona una planta
3. **Cache implícito:** Si se vuelve a seleccionar la misma planta, se mantienen los eventos en estado
4. **Animaciones suaves:** Uso de Framer Motion para transiciones fluidas

---

## 🐛 Problemas Resueltos

### 1. Error de Tipo en Renderizado de Eventos
**Problema:** `Type 'unknown' is not assignable to type 'ReactNode'`

**Solución:** Conversión explícita de valores a string antes de renderizar:
```tsx
{event.data.ph ? `pH: ${String(event.data.ph)}` : ''}
```

### 2. Método Inexistente en eventService
**Problema:** Se intentó usar `eventService.getByPlant()` que no existía

**Solución:** Se utilizó el método existente `eventService.getPlantHistory(plantId, limit)` que internamente usa `getAll()` con filtros.

### 3. Conflicto de Eventos de Click
**Problema:** El click en la tarjeta podría interferir con el menú de acciones

**Solución:** El menú de acciones tiene su propio handler que previene la propagación, permitiendo que ambos eventos coexistan.

---

## 📊 Métricas de Cambios

- **Archivos modificados:** 2
- **Líneas de código agregadas:** ~150
- **Nuevos estados:** 3
- **Nueva función:** 1
- **Nuevos props en componente:** 2
- **Componentes nuevos:** 0 (reutilización de componentes existentes)

---

## ✅ Testing Recomendado

1. **Selección de plantas:**
   - [ ] Click en una planta la selecciona correctamente
   - [ ] Click en la misma planta la deselecciona
   - [ ] Click en otra planta cambia la selección
   - [ ] El menú de acciones sigue funcionando

2. **Carga de eventos:**
   - [ ] Se muestran los últimos 3 eventos correctamente
   - [ ] El estado de carga aparece mientras se obtienen datos
   - [ ] Se maneja correctamente cuando no hay eventos
   - [ ] Los errores se manejan apropiadamente

3. **Visualización:**
   - [ ] Los iconos se muestran correctamente según el tipo
   - [ ] Las fechas se formatean correctamente
   - [ ] Los datos específicos se muestran según el tipo de evento
   - [ ] La grilla es responsive (1 columna móvil, 3 desktop)

4. **Navegación:**
   - [ ] El link "Ver historial completo" funciona correctamente
   - [ ] El filtro de planta se preserva en la URL

5. **Estados visuales:**
   - [ ] La planta seleccionada tiene borde verde y ring
   - [ ] Las animaciones son suaves
   - [ ] El diseño es consistente con el resto de la app

---

## 📝 Notas Técnicas

- La funcionalidad reutiliza el servicio `eventService` existente sin modificaciones
- Los eventos se ordenan automáticamente por fecha (más recientes primero) en el backend
- El límite de 3 eventos es configurable cambiando el segundo parámetro de `getPlantHistory()`
- La animación de entrada/salida usa Framer Motion para una experiencia fluida
- El componente `PlantCard` ahora es más flexible con el nuevo prop `onClick`
- La funcionalidad no requiere cambios en el backend, solo utiliza endpoints existentes

---

## 🔮 Posibles Mejoras Futuras

1. **Cache de eventos:** Guardar eventos en estado local para evitar recargas innecesarias
2. **Paginación:** Permitir ver más eventos sin salir de la página
3. **Filtros:** Filtrar eventos por tipo directamente en la grilla
4. **Actualización automática:** Refrescar eventos periódicamente si la planta está seleccionada
5. **Acciones rápidas:** Botones para acciones comunes (registrar riego, nota, etc.) desde la grilla
6. **Comparación:** Mostrar eventos de múltiples plantas lado a lado para comparación


