# Dirección visual — "sala de control"

<!-- [agent:server-audit][date:2026-09-05][action:created] -->

Aprobada por Juan el 2026-09-05 (opción "oscuro sobrio, sala de control"). Este documento es el
brief para la fase 1 y la referencia para las fases siguientes. Cuando algo del código actual
contradiga este documento, gana este documento.

## Principios

1. **El color es estado.** El fondo, las superficies y el texto son neutros verdosos. El verde de
   acento marca la acción primaria y la navegación activa. Los colores fuertes (ámbar, rojo, azul)
   aparecen únicamente para decir algo del cultivo: sensor fuera de rango, dispositivo sin
   conexión, riego en curso. Nunca decorativos.
2. **Plano y nítido.** Tarjetas con fondo sólido y borde de 1 px. Sin glassmorphism, sin
   `backdrop-blur`, sin degradés de fondo, sin sombras grandes. Una sola sombra sutil para
   elementos flotantes (menús, diálogos).
3. **Densidad media.** Es una herramienta operativa que se usa en el celular en la sala de
   cultivo y en la PC. Padding 16 px en tarjetas, 12 px en filas. Texto base 14 px, nunca menos
   de 12 px.
4. **Honestidad con los datos.** Si no hay lectura, se dice "sin dato" con un guion largo (—),
   nunca un cero. Si un servicio falló, se dice cuál y hace cuánto.
5. **Sin prosa perecedera.** Ni frases de bienvenida ni "Selecciona una unidad para ver sus
   detalles". Títulos, datos, acciones.

## Tokens (van a `tailwind.config.ts`, se borran `styles/tokens.css` y `lib/featureFlags.ts`)

Todos como variables CSS en `:root` y expuestos a Tailwind vía `theme.extend.colors` para poder
escribir `bg-surface`, `text-fg-muted`, `border-edge`.

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#0b0f0d` | fondo de página |
| `surface` | `#111714` | tarjetas, paneles |
| `surface-2` | `#171f1b` | filas alternas, inputs, hover de tarjeta |
| `surface-3` | `#1e2823` | elementos elevados: menús, popovers, diálogos |
| `edge` | `#243029` | borde estándar |
| `edge-strong` | `#33423a` | borde de foco/hover, separadores fuertes |
| `fg` | `#e8efea` | texto principal |
| `fg-muted` | `#93a59b` | texto secundario, labels |
| `fg-faint` | `#5f6f66` | placeholders, metadatos |
| `accent` | `#2fbf71` | acción primaria, nav activa, links |
| `accent-hover` | `#28a862` | |
| `accent-fg` | `#06130c` | texto sobre `accent` |
| `accent-soft` | `rgba(47,191,113,0.12)` | fondo de item activo, badges de acento |
| `ok` | `#2fbf71` | estado normal (mismo verde) |
| `warn` | `#e0a82e` | atención: sensor cerca del límite, batería, aviso |
| `danger` | `#e5484d` | crítico: fuera de rango, error, destructivo |
| `info` | `#4c9fe8` | riego / agua / humedad como magnitud, links secundarios |
| `offline` | `#6b7a72` | dispositivo o sensor sin conexión (gris, sin dramatismo) |

Radios: `sm` 6 px (badges, inputs), `md` 10 px (botones, tarjetas), `lg` 14 px (diálogos,
sheets). Sombra única: `0 8px 24px rgba(0,0,0,0.35)` solo en `surface-3` flotante.

Tipografía: **Manrope** para todo el texto (ya está cargada), **Space Grotesk** solo para
números grandes de sensores y títulos de página (`font-display`). Escala: 12 / 14 / 16 / 20 /
24 / 32. Números de lecturas con `tabular-nums`.

Iconos: Lucide, 16 px en texto y botones, 20 px en nav, 24 px en tarjetas de estado. Un solo
peso.

## Shell (layout raíz, para TODAS las rutas menos `/login` y `/register`)

**Desktop (≥ 1024 px):** sidebar izquierda fija de 240 px, colapsable a 64 px (solo iconos,
recordado en `localStorage`). Arriba: logo + nombre "Cultivo". Ítems de nav en orden:

1. Inicio (`/`) — dashboard
2. Salas (`/sala`)
3. Ciclos (`/seguimientos`)
4. Automatizaciones (`/automatizaciones`)
5. Dispositivos (`/artefactos`)
6. Notificaciones (`/notificaciones`) con contador
7. — separador —
8. Usuarios (`/admin/usuarios`) solo si `isAdmin`

Abajo del sidebar: menú de usuario (avatar con inicial, nombre, plan) que abre dropdown con
"Cerrar sesión". El contenido ocupa el resto con `max-w-[1400px]` y padding 24 px. Sin header
superior: cada página trae su propio encabezado (`PageHeader`: título, subtítulo opcional,
acciones a la derecha, breadcrumb cuando hay jerarquía como Sala › Carpa).

**Móvil (< 1024 px):** barra superior de 56 px con título de la página a la izquierda (o flecha
atrás + título cuando la ruta es hija, por ejemplo Carpa), campana y avatar a la derecha. Barra
inferior fija de 5 pestañas: Inicio · Salas · Ciclos · Automatizaciones · Más. "Más" abre un
`Sheet` desde abajo con Dispositivos, Notificaciones, Usuarios (si admin) y Cerrar sesión. El
contenido tiene `pb-20` para no quedar bajo la barra. Nunca overflow horizontal: tablas pasan a
lista de tarjetas por debajo de 768 px.

Las rutas actuales se conservan (no romper links ni el bot). Se eliminan: los `layout.tsx` por
ruta que montan `Header`, el componente `Header.tsx`, `DoorAnimation` como home. La animación de
puerta puede quedar como transición de 1,2 s después del login exitoso, opcional, y solo si no
demora el acceso.

## Home única (`/`) — dashboard operativo

Grilla responsive (1 col móvil, 2 col tablet, 3 col desktop) de bloques, en este orden:

1. **Alertas activas** (solo si hay): lista compacta de sensores fuera de rango y dispositivos
   offline, con link a la carpa. Si no hay, una línea "Todo en rango · actualizado hace 30 s".
2. **Carpas**: una tarjeta por carpa con nombre, sala, últimas lecturas (temperatura, humedad,
   VPD si existe) como números grandes con color de estado, cantidad de plantas, etapa
   predominante, y dispositivos encendidos como chips. Click lleva a la carpa.
3. **Ciclos activos**: nombre, días transcurridos, plantas, último evento.
4. **Dispositivos con problema** (si hay): los que devuelven error de estado.
5. **Clima exterior**: si el widget falla, se muestra "Clima no disponible" en gris, sin
   números.

Sin saludo, sin fecha decorativa, sin "¿A qué sala quieres ingresar?".

## Carpa viva (`/sala/carpa/[id]`)

La vista inicial de la carpa es un puesto de operación con una réplica 3D construida con Three.js,
React Three Fiber y Drei. La escena reproduce la carpa Flora de 1,20 × 1,20 × 2 m a partir de las
fotos de referencia: lona con pliegues, costuras y cierres, LED con diodos y suspensión, dos redes
SCROG deformadas, seis plantas ramificadas con hojas serradas, ventilación, extracción, sensores y
equipo de CO₂. La morfología y las alturas son representaciones declaradas; estados y lecturas
provienen de las plantas y dispositivos reales.

Los modos **Cultivo**, **Ambiente** y **Equipos** cambian los marcadores y accesos disponibles. Las
alertas enfocan el elemento afectado; el inspector reutiliza `PlantCard` y `DeviceControlCard`,
muestra actividad reciente y abre el registro de eventos. La banda ambiental conserva los estados
`unknown`, pausa y offline. El CO₂ proviene del sensor disponible que lo mide, con independencia
del sensor principal de temperatura/humedad. La evolución usa `SensorHistoryChart`. El comparador
alterna entre la réplica y la foto real, identificada como imagen estática de referencia.

La pestaña **Gestión** conserva administración, PPFD, planes y formularios extensos. Las vistas
frontal, cenital y perspectiva, las capas y la lista HTML tienen fallback fotográfico sin WebGL.
El canvas se carga de forma diferida, usa `frameloop="demand"`, limita DPR y congela las sombras
para no bloquear la interacción; respeta `prefers-reduced-motion` y mantiene el texto en HTML.

## Componentes base (shadcn/ui sobre Radix, instalados de verdad)

Instalar con la CLI de shadcn y adaptar a los tokens: `button`, `badge`, `card`, `input`,
`label`, `select`, `checkbox`, `switch`, `tabs`, `dialog`, `sheet`, `dropdown-menu`, `tooltip`,
`table`, `skeleton`, `separator`, `scroll-area`, `toast` (o mantener el `ToastContext` actual si
ya funciona bien, pero con el estilo nuevo). Los componentes propios de `components/ui/` que
dupliquen uno de shadcn se eliminan y se migran los usos.

Variantes de `Button`: `primary` (accent), `secondary` (surface-2 + edge), `ghost`, `danger`
(danger sólido, solo para destructivo confirmado), `icon`. Tamaños `sm` 32 px, `md` 36 px, `lg`
44 px (móvil, acciones principales).

Componentes propios que sí se mantienen y se restilizan: `SensorCard`, `DeviceControlCard`,
`PlantCard`, `CarpaCard`, `SensorHistoryChart` (recharts con los tokens: líneas finas, grilla en
`edge`, tooltip en `surface-3`), `EmptyState`, `ConfirmDialog` (sobre `Dialog`).

## Estados

- **Cargando:** skeletons con la forma del contenido, nunca un spinner a pantalla completa
  (excepto el chequeo inicial de sesión).
- **Vacío:** ícono 24 px en `fg-faint`, una línea de título, una acción. Sin ilustraciones
  grandes.
- **Error de servicio:** banner dentro del bloque afectado, color `warn`, texto "Sin respuesta
  del servicio Tuya desde hace 4 min · Reintentar". El resto de la página sigue funcionando.
- **Sin dato:** `—` en `fg-faint`. Nunca `0 °C`, `0 %`.

## Qué no hacer

- Degradés de marca (`from-emerald-500 to-cyan-500`), `backdrop-blur`, brillos.
- Un color distinto por tarjeta de carpa "para diferenciarlas": se diferencian por nombre y
  por sus datos.
- Emojis en títulos o notificaciones (hoy: "🌩️ Alerta Climática"). Ícono Lucide.
- Acordeones cerrados por defecto para el contenido principal: usar `Tabs`.
- `<select>`, `<input type=checkbox>` y `window.confirm` nativos.
- Texto que narra lo que ya muestran los datos.

## QA visual obligatorio por fase

`QA_LABEL=fase<N> npm run qa:nav` contra producción, capturas en
`docs/rediseno-2026-09/capturas/fase<N>/`, desktop y móvil, más una autocrítica escrita en el
reporte comparando contra este documento: qué cumple, qué no, qué quedó para la fase siguiente.
