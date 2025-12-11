# Changelog - Sistema de Layout Configurable y Gestión de Historial de Sensores

## Fecha: 2024-01-XX

### Resumen
Se implementó un sistema completo de personalización de layout para las páginas de CARPA (secciones), permitiendo a los usuarios habilitar/deshabilitar secciones y reordenarlas según sus preferencias. Además, se agregó la funcionalidad de registro de historial para sensores y un selector de métricas para visualización de datos históricos.

---

## 1. Sistema de Layout Configurable

### 1.1 Backend - Modelo de Datos

#### Nuevo Modelo: `SectionLayout`
**Archivo:** `backend/prisma/schema.prisma`

Se agregó un nuevo modelo para almacenar la configuración de layout de cada sección:

```prisma
model SectionLayout {
  id        String   @id @default(uuid())
  sectionId String   @unique @map("section_id")
  section   Section  @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  config    Json     // { sections: [{ key, enabled, order }] }
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("section_layouts")
}
```

**Relación:** Uno-a-uno con `Section` (cada sección puede tener una configuración de layout).

#### DTOs para Layout
**Archivo:** `backend/src/modules/locations/dto/layout.dto.ts`

Se crearon DTOs para validar y estructurar la configuración de layout:

- `SectionLayoutItemDto`: Define cada sección con su clave, estado habilitado y orden
- `UpdateSectionLayoutDto`: DTO para actualizar la configuración
- `DEFAULT_LAYOUT_CONFIG`: Configuración por defecto con todas las secciones habilitadas

**Secciones disponibles:**
- `summary`: Resumen General
- `environment`: Panel Ambiental
- `sensors`: Sensores Adicionales
- `controllables`: Control de Dispositivos
- `cameras`: Cámaras
- `ppfd`: Intensidad Lumínica (PPFD/DLI)
- `sensorHistory`: Historial de Sensores
- `feedingPlans`: Plan de Alimentación
- `preventionPlans`: Plan de Prevención
- `plants`: Plantas

#### Endpoints API
**Archivo:** `backend/src/modules/locations/sections.controller.ts`

**GET `/sections/:id/layout`**
- Obtiene la configuración de layout de una sección
- Si no existe, devuelve la configuración por defecto
- Respuesta incluye flag `isDefault` para indicar si es la configuración guardada

**PUT `/sections/:id/layout`**
- Actualiza la configuración de layout de una sección
- Si no existe, la crea (upsert)
- Valida que la sección exista antes de guardar

#### Servicio de Layout
**Archivo:** `backend/src/modules/locations/locations.service.ts`

**Métodos implementados:**
- `getSectionLayout(sectionId)`: Obtiene o devuelve configuración por defecto
- `updateSectionLayout(sectionId, data)`: Actualiza o crea la configuración

**Nota técnica:** Se usa `JSON.parse(JSON.stringify(...))` para asegurar compatibilidad con Prisma `Json` type.

---

### 1.2 Frontend - Componentes y Tipos

#### Tipos TypeScript
**Archivo:** `frontend/src/types/index.ts`

Se agregaron tipos para el sistema de layout:

```typescript
export type SectionLayoutKey = 
  | 'summary' | 'environment' | 'sensors' | 'controllables' 
  | 'cameras' | 'ppfd' | 'sensorHistory' 
  | 'feedingPlans' | 'preventionPlans' | 'plants';

export interface SectionLayoutItem {
  key: SectionLayoutKey;
  enabled: boolean;
  order: number;
}

export interface SectionLayoutConfig {
  sections: SectionLayoutItem[];
}

export interface SectionLayout {
  id: string;
  sectionId: string;
  config: SectionLayoutConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Metadata para el editor:**
- `SECTION_LAYOUT_META`: Define nombre, icono y color para cada sección
- `DEFAULT_SECTION_LAYOUT`: Configuración por defecto en el frontend

#### Servicio de Layout
**Archivo:** `frontend/src/services/locationService.ts`

Se extendió `sectionService` con métodos para gestionar el layout:

```typescript
getLayout: (id: string) => api.get<SectionLayout>(`/sections/${id}/layout`)
updateLayout: (id: string, config: SectionLayoutConfig) => 
  api.put<SectionLayout>(`/sections/${id}/layout`, config)
```

#### Componente Editor de Layout
**Archivo:** `frontend/src/components/SectionLayoutEditor.tsx`

Componente modal completo para editar el layout de secciones:

**Características:**
- Lista de secciones con drag-and-drop (usando `@dnd-kit/core`)
- Toggle de visibilidad (ojo) para habilitar/deshabilitar
- Flechas arriba/abajo para ajustar orden manualmente
- Indicador de número de orden (#1, #2, etc.)
- Contador de secciones visibles
- Botón "Restaurar" para volver a la configuración por defecto
- Validación: al menos una sección debe estar habilitada

**Funcionalidad:**
- `handleDragEnd`: Maneja el reordenamiento por drag-and-drop
- `handleToggle`: Habilita/deshabilita secciones
- `handleMoveUp/Down`: Ajusta el orden manualmente
- `handleSave`: Guarda la configuración en el backend
- `handleRestore`: Restaura la configuración por defecto

#### Integración en Página de Carpa
**Archivo:** `frontend/src/app/sala/carpa/[id]/page.tsx`

**Cambios principales:**

1. **Estado y carga de layout:**
   ```typescript
   const [layoutConfig, setLayoutConfig] = useState<SectionLayoutConfig>(DEFAULT_SECTION_LAYOUT);
   const [showLayoutEditor, setShowLayoutEditor] = useState(false);
   
   async function loadLayout() {
     const layout = await sectionService.getLayout(sectionId);
     setLayoutConfig(layout?.config || DEFAULT_SECTION_LAYOUT);
   }
   ```

2. **Renderizado dinámico de secciones:**
   - Función `renderSection(key, index)` que renderiza cada sección según su clave
   - Ordenamiento usando `sortedLayoutSections` basado en `order`
   - Secciones complejas (feedingPlans, preventionPlans, plants) usan CSS `order` para respetar el orden

3. **Botón "Layout" en el header:**
   - Abre el modal `SectionLayoutEditor`
   - Permite editar la configuración de la sección actual

4. **Secciones colapsables:**
   - PPFD y SensorHistory ahora son secciones colapsables (expand/collapse)
   - Estado local `ppfdExpanded` y `sensorHistoryExpanded`

---

## 2. Toggle "Registrar Historial" para Sensores

### 2.1 Backend - Campo `recordHistory`

#### DTO de Dispositivo
**Archivo:** `backend/src/modules/devices/dto/device.dto.ts`

Se agregó el campo opcional `recordHistory`:

```typescript
@ApiPropertyOptional({
  description: 'Si el dispositivo debe registrar historial (solo para sensores)',
  example: true,
})
@IsBoolean()
@IsOptional()
recordHistory?: boolean;
```

#### Servicio de Dispositivos
**Archivo:** `backend/src/modules/devices/devices.service.ts`

El método `update` ahora incluye `recordHistory` en los campos actualizables:

```typescript
...(data.recordHistory !== undefined && { recordHistory: data.recordHistory }),
```

#### Servicio de Historial de Sensores
**Archivo:** `backend/src/modules/devices/sensor-history.service.ts`

El cron job que registra lecturas cada 15 minutos ahora filtra dispositivos con `recordHistory = true`:

```typescript
const devices = await this.prisma.device.findMany({
  where: {
    recordHistory: true,
    type: DeviceType.SENSOR,
  },
});
```

### 2.2 Frontend - Toggle en Componentes

#### Tipo Device
**Archivo:** `frontend/src/types/index.ts`

Se agregó el campo `recordHistory` al interface `Device`:

```typescript
export interface Device {
  // ... otros campos
  recordHistory?: boolean; // Si registra historial (solo sensores)
  // ...
}
```

#### Componente DeviceControlCard
**Archivo:** `frontend/src/components/DeviceControlCard.tsx`

**Cambios:**
- Estado local para `recordHistory` y `togglingHistory`
- Función `handleToggleRecordHistory` que actualiza el dispositivo
- UI: Botón toggle con icono `History` y estado visual (morado cuando activo)
- Ubicación: Dentro de la sección de valores del sensor

**Características:**
- Actualización optimista (cambia inmediatamente, revierte si falla)
- Deshabilitado durante la actualización
- Feedback visual claro (color morado cuando está activo)

#### Componente EnvironmentPanel
**Archivo:** `frontend/src/components/EnvironmentPanel.tsx`

**Cambios:**
- Mismo estado y lógica que `DeviceControlCard`
- UI: Botón compacto junto al nombre del sensor en el header
- Texto: "Historial ON" / "Historial OFF" con icono

**Ubicación:** En el header del panel, junto al nombre del sensor y la última actualización.

---

## 3. Selector de Métricas en Historial de Sensores

### 3.1 Componente SensorHistoryChart
**Archivo:** `frontend/src/components/SensorHistoryChart.tsx`

#### Configuración de Métricas
Se definió un array `METRICS` con la configuración de cada métrica:

```typescript
const METRICS: MetricConfig[] = [
  { key: 'temperature', label: 'Temperatura', color: '#fb923c', icon: Thermometer, unit: '°C' },
  { key: 'humidity', label: 'Humedad', color: '#22d3ee', icon: Droplets, unit: '%' },
  { key: 'co2', label: 'CO₂', color: '#34d399', icon: Wind, unit: 'ppm' },
];
```

#### Estado de Métricas Visibles
```typescript
const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(
  () => new Set<MetricKey>(['temperature', 'humidity'])
);
```

**Por defecto:** Temperatura y Humedad están visibles.

#### Funcionalidad

1. **Detección de métricas disponibles:**
   - Filtra métricas basándose en qué datos están presentes en las lecturas
   - Si no hay lecturas, muestra temp y humedad por defecto

2. **Selector de métricas:**
   - Botones con iconos para cada métrica disponible
   - Estado visual: fondo gris cuando activo, transparente cuando inactivo
   - Validación: No permite desactivar todas las métricas (mínimo 1)

3. **Renderizado dinámico de líneas en gráfico:**
   - Solo renderiza `Line` components para métricas visibles
   - Usa colores y nombres definidos en `METRICS`

4. **Modal de historial completo:**
   - Mismo selector de métricas disponible
   - Permite filtrar por rango de fechas
   - Muestra todas las métricas seleccionadas en el gráfico grande

#### UI del Selector

**Vista compacta (widget):**
- Botones pequeños con solo iconos
- Tooltip al hover mostrando nombre de la métrica
- Borde de color cuando está activo

**Vista modal:**
- Botones más grandes con icono + texto
- Mejor visibilidad para selección rápida

---

## 4. Correcciones y Mejoras Adicionales

### 4.1 Orden de Renderizado de Secciones

**Problema:** Las secciones no respetaban el orden configurado en el layout.

**Solución:**
- Secciones simples (environment, sensors, controllables, cameras, ppfd, sensorHistory): Renderizadas dinámicamente usando `renderSection()`
- Secciones complejas (feedingPlans, preventionPlans, plants): Usan CSS `order` property para respetar el orden sin cambiar la estructura del DOM

**Implementación:**
```typescript
style={{ order: sortedLayoutSections.find(s => s.key === 'feedingPlans')?.order ?? 6 }}
```

### 4.2 Secciones Colapsables

Se agregó funcionalidad de expand/collapse para:
- **PPFD por Zona**: Sección colapsable con botón y chevron
- **Historial de Sensores**: Sección colapsable con botón y chevron

**Estado:**
```typescript
const [ppfdExpanded, setPpfdExpanded] = useState(false);
const [sensorHistoryExpanded, setSensorHistoryExpanded] = useState(false);
```

### 4.3 Limpieza de Código

- Removida sección de "Dispositivos vacíos" cuando no hay dispositivos
- Mejorada la estructura de renderizado dinámico
- Corregido orden de declaración de funciones (dependencias)

---

## 5. Migración de Base de Datos

### Comando Ejecutado
```bash
cd backend
npx prisma db push
```

**Nota:** Se usó `db push` en lugar de `migrate dev` para evitar pérdida de datos, ya que el usuario tenía datos existentes.

### Cambios en Schema
- Nueva tabla `section_layouts`
- Relación uno-a-uno con `sections`
- Campo `layout` agregado a `Section` (opcional)

---

## 6. Uso del Sistema

### 6.1 Configurar Layout de una Carpa

1. Navegar a la página de la carpa (ej: `/sala/carpa/[id]`)
2. Click en botón **"Layout"** en el header
3. En el modal:
   - **Arrastrar** secciones para reordenarlas
   - **Click en el ojo** para habilitar/deshabilitar
   - **Flechas arriba/abajo** para ajustar orden manualmente
   - **"Restaurar"** para volver a la configuración por defecto
4. Click en **"Guardar"** para aplicar cambios

### 6.2 Activar Registro de Historial

**Para sensor principal:**
1. En el panel "Ambiente", buscar el botón **"Historial OFF"** junto al nombre del sensor
2. Click para activar → cambia a **"Historial ON"** (color morado)
3. El backend comenzará a registrar lecturas cada 15 minutos automáticamente

**Para sensores adicionales:**
1. En la sección "Sensores", buscar la tarjeta del sensor
2. En la parte inferior de la tarjeta, buscar el toggle **"Registrar historial"**
3. Click para activar/desactivar

### 6.3 Filtrar Métricas en Historial

1. Activar el registro de historial (ver sección 6.2)
2. Esperar a que se acumulen datos (mínimo 1 lectura)
3. En la sección "Historial de Sensores":
   - Click en los **iconos de métricas** en el header para mostrar/ocultar
   - Temperatura (icono naranja), Humedad (icono azul), CO₂ (icono verde)
4. El gráfico se actualiza automáticamente mostrando solo las métricas seleccionadas

---

## 7. Archivos Modificados

### Backend
- `backend/prisma/schema.prisma` - Nuevo modelo SectionLayout
- `backend/src/modules/locations/dto/layout.dto.ts` - Nuevo archivo con DTOs
- `backend/src/modules/locations/sections.controller.ts` - Nuevos endpoints
- `backend/src/modules/locations/locations.service.ts` - Lógica de layout
- `backend/src/modules/devices/dto/device.dto.ts` - Campo recordHistory
- `backend/src/modules/devices/devices.service.ts` - Actualización de recordHistory

### Frontend
- `frontend/src/types/index.ts` - Tipos de layout y recordHistory
- `frontend/src/services/locationService.ts` - Métodos de layout
- `frontend/src/components/SectionLayoutEditor.tsx` - Nuevo componente editor
- `frontend/src/components/DeviceControlCard.tsx` - Toggle de historial
- `frontend/src/components/EnvironmentPanel.tsx` - Toggle de historial
- `frontend/src/components/SensorHistoryChart.tsx` - Selector de métricas
- `frontend/src/app/sala/carpa/[id]/page.tsx` - Integración completa

---

## 8. Notas Técnicas

### 8.1 TypeScript y Prisma Json
Se usó `JSON.parse(JSON.stringify(...))` para convertir objetos TypeScript a JSON plano compatible con Prisma `Json` type, evitando errores de tipo estricto.

### 8.2 CSS Order vs Reordenamiento DOM
Para secciones complejas con mucho contenido, se usa CSS `order` en lugar de reordenar el DOM para mejor rendimiento.

### 8.3 Estado Optimista
Los toggles de historial usan actualización optimista para mejor UX, revirtiendo automáticamente si la petición falla.

### 8.4 Validaciones
- Al menos una sección debe estar habilitada en el layout
- Al menos una métrica debe estar visible en el historial
- El backend valida que el dispositivo exista antes de actualizar `recordHistory`

---

## 9. Próximas Mejoras Sugeridas

1. **Persistencia de estado colapsado**: Guardar qué secciones están expandidas/colapsadas
2. **Templates de layout**: Permitir guardar y aplicar layouts predefinidos
3. **Exportar/Importar layout**: Compartir configuraciones entre secciones
4. **Historial de cambios**: Auditoría de modificaciones en el layout
5. **Vista previa**: Mostrar cómo se verá el layout antes de guardar

---

## 10. Testing

### Casos de Prueba Recomendados

1. **Layout:**
   - Crear layout personalizado y verificar orden
   - Deshabilitar todas las secciones (debe fallar)
   - Restaurar configuración por defecto
   - Verificar persistencia después de recargar página

2. **Historial:**
   - Activar historial y verificar que se registren lecturas
   - Desactivar historial y verificar que se detenga
   - Verificar que solo sensores con `recordHistory=true` registren datos

3. **Selector de métricas:**
   - Seleccionar/deseleccionar métricas y verificar gráfico
   - Intentar desactivar todas las métricas (debe fallar)
   - Verificar que solo se muestren métricas con datos disponibles

---

**Fin del Documento**

