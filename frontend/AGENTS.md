# Frontend Guide (Next.js)

Aplicación web React Next.js 14 con App Router y diseño Tailwind CSS.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + `clsx` + `tailwind-merge`
- **UI Libs**: Framer Motion (animaciones), Lucide React (iconos), Recharts (gráficos)
- **3D**: Three.js + React Three Fiber 8 (compatible con React 18) + Drei. La réplica interactiva vive en `src/features/carpa-viva/`.

## Skill Mapping (Frontend)
Skills primarias para tareas en frontend:

- `ui-design-system`: Cambios de estilo, componentes, layout, responsive y consistencia visual.
- `feature-implementation`: Nuevas paginas, integraciones con APIs y flujos de producto.
- `refactor-and-cleanup`: Simplificacion de componentes, extraccion de piezas reutilizables y limpieza.
- `iot-device-integration`: UI para tipos de dispositivo, controles especificos e iconografia de dispositivos.

### Prioridad Recomendada
1. Para cambios visuales o de UX, iniciar por `ui-design-system` (obligatoria).
2. Para nuevas capacidades funcionales, combinar con `feature-implementation`.
3. Para mejoras internas sin cambio funcional, usar `refactor-and-cleanup`.
4. Si la UI depende de nuevos dispositivos, sumar `iot-device-integration`.

## Ejecutar Localmente

```powershell
# Instalación
npm install

# Servidor de desarrollo
# Por defecto puerto 3001 (ver package.json o next.config)
npm run dev
```

## Guías de Estilo & UI
- **Mobile First**: El diseño debe ser totalmente responsive, priorizando la vista móvil.
- **Estética**: sala de control oscura con los tokens de `globals.css`. Carpa viva es un puesto de operación 3D: modos Cultivo/Ambiente/Equipos, alertas que enfocan objetos, actividad, historial y comparador fotográfico. El texto operativo sigue en HTML, con estados honestos y fallback accesible. La escena usa `frameloop="demand"` y sombras congeladas para evitar render continuo.
- **Componentes**:
  - Preferir composición sobre herencia.
  - Usar `cn()` (utility en `lib/utils`) para clases condicionales.
```typescript
import { cn } from "@/lib/utils";

export function Button({ className, ...props }) {
  return <button className={cn("px-4 py-2 bg-primary", className)} {...props} />;
}
```

## Estructura
- `/app`: Rutas y páginas (App Router).
- `/components`: Componentes reutilizables (UI, dashboards, etc.).
- `/lib`: Utilidades, servicios de API (`apiService`, `deviceService`).
- `/types`: Definiciones de TypeScript compartidas con backend (idealmente).
