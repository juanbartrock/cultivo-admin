# Informe de Auditoría y Propuestas de Mejora

## Contexto
Auditoría integral de la aplicación de automatización de cultivo, analizada desde las perspectivas de Arquitectura de Software, UX/UI y Producto.

---

## Sección 1: Mejoras Técnicas (El Arquitecto)

**Diagnóstico General:** La arquitectura base (NestJS + Next.js + Prisma) es sólida, pero el proyecto presenta características de un "prototipo avanzado" que requiere robustez para un entorno de producción seguro y escalable.

| Prioridad | Hallazgo | Impacto Técnico | Esfuerzo | Solución Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| **CRÍTICA** | **Ausencia de Seguridad / Auth** | 🔴 **Alto**. Inexistencia de barreras de acceso. Cualquier usuario en la red puede controlar dispositivos críticos o manipular datos. | 💪 Medio | Implementar **AuthGuard** global en NestJS (JWT/Passport) y Middleware de protección de rutas en Next.js. |
| **ALTA** | **Polling ineficiente** | 🟠 **Medio**. `useDevicesStatus` realiza consultas HTTP cada 30s. Esto escala linealmente mal y satura innecesariamente servidor y red. | 💪 Medio | Migrar de polling a **WebSockets (Socket.io)** para eventos en tiempo real (lecturas de sensores y cambios de estado de actuadores). |
| **MEDIA** | **Lógica de negocio en UI** | 🟡 **Medio**. Componentes como `sala/page.tsx` son monolíticos (+500 líneas) y acoplan lógica de datos con presentación. | 🤏 Bajo | **Refactorización**: Extraer lógica a Custom Hooks (`useRoomLogic`, `useSectionManager`) y adoptar patrón Container/Presentational. |
| **MEDIA** | **Gestión de DB insegura** | 🟡 **Medio**. El uso sugerido de `prisma db push` es peligroso para integridad en producción (riesgo de pérdida de datos). | 🤏 Bajo | Establecer flujo estricto de migraciones con `prisma migrate dev` (local) y `prisma migrate deploy` (prod). |
| **BAJA** | **Alertas Nativas** | 🟡 **Medio**. Uso de `window.confirm()` y `alert()` bloquea el hilo principal de ejecución y degrada la experiencia. | 🤏 Bajo | Implementar sistema de notificaciones no bloqueantes (**Toasts**) y Modales controlados por estado global (Context API). |

---

## Sección 2: Crítica de UX/UI (El Diseñador)

**Diagnóstico Visual:** La interfaz posee una base "Dark Mode" funcional, pero la experiencia se siente interrumpida y poco fluida debido a interacciones nativas y falta de guías visuales.

| Prioridad | Problema UX | Fricción Visual | Esfuerzo | "Quick Win" (Solución Rápida) |
| :--- | :--- | :--- | :--- | :--- |
| **ALTA** | **Alertas del Navegador** | Los diálogos nativos ("¿Estás seguro...?") rompen la inmersión visual de la aplicación y parecen anticuados. | 🤏 Bajo | **Modernización**: Reemplazar con Modales estilizados (Glassmorphism) usando Framer Motion para entradas/salidas suaves. |
| **MEDIA** | **Empty States Pobres** | Los estados vacíos (sin salas/secciones) carecen de empatía y guía. | 🤏 Bajo | **Guía Visual**: Incorporar ilustraciones SVG sutiles y animaciones en los botones de acción principal ("Call to Action") para invitar al uso. |
| **MEDIA** | **Navegación Profunda** | Excesivos clics para llegar a la unidad mínima de valor (Planta). Ruta: Sala -> Sección -> Planta. | 💪 Medio | **Dashboard Resumido**: Crear una vista de "Resumen Ejecutivo" en el Home que exponga directamente alertas críticas o plantas en etapas clave. |

---

## Sección 3: Valor Funcional (El PM)

**Análisis de Producto:** La aplicación resuelve eficazmente la "Gestión" y el "Control", pero carece de la capa de "Inteligencia" y "Preventiva" que aporta verdadero valor diferencial al cultivador.

### Funcionalidades Faltantes Clave

| Tipo | Feature | Justificación | Impacto Negocio |
| :--- | :--- | :--- | :--- |
| **Básico** | **Gráficos Históricos** | El cultivo depende de la estabilidad ambiental histórica (VPD, promedios), no solo del dato instantáneo. | 🔴 Alto (Retención y Utilidad) |
| **Básico** | **Sistema de Alertas (Push)** | Fallos críticos (ej. temperatura > 35°C) requieren atención inmediata fuera de la aplicación. | 🔴 Alto (Seguridad del Cultivo) |

### 🚀 Propuesta "Killer Feature": CropGPT Assistant

**Concepto:** Transformar la aplicación de una herramienta pasiva a un **Asistente Inteligente Proactivo**.

**Funcionalidades:**
1.  **Diagnóstico Preventivo:** Análisis de riesgos basado en datos ambientales históricos.
    *   *Ejemplo:* "Humedad nocturna > 80% persistente en semana 5 de floración → **Alerta de riesgo alto de hongos (Botrytis)**."
2.  **Proyección de Cosecha:** Estimación automática fechas clave basada en la genética y fecha de inicio de floración.
    *   *Output:* Calendario visual con fechas estimadas de lavado de raíces y corte.
3.  **Viabilidad:** Técnicamente implementable hoy utilizando los datos existentes en `SensorReading` y métricas de `Strain`.
