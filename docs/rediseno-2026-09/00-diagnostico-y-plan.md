# Rediseño de Cultivo Admin — diagnóstico y plan

<!-- [agent:server-audit][date:2026-09-05][action:created] -->

Fecha: 2026-09-05. Autor: server-audit. Estado: **plan propuesto, a la espera del OK de Juan
sobre dirección visual y alcance.**

Capturas del estado actual ("antes") en `capturas/antes/` — recorrido logueado con Playwright,
desktop 1440×900 y móvil 390×844, todas las rutas.

---

## 1. Qué hay hoy

| Dato | Valor |
|---|---|
| Frontend | Next.js 14.2 App Router, React 18, Tailwind 3.4, framer-motion, recharts, React Query 5 |
| Líneas de frontend (`src/`) | ~26.900 |
| Pantallas monolíticas | `CarpaDetailPage.tsx` 2.815 · `AutomatizacionesPage.tsx` 2.191 · `SeguimientosPage.tsx` 2.164 · `PlantCard.tsx` 1.140 · `artefactos/page.tsx` 1.051 |
| Componentes base propios | `ui/` con Button, Badge, Card, Modal, ConfirmDialog, Skeleton, EmptyState |
| Radix / shadcn | **No instalados.** El `CLAUDE.md` del proyecto dice "Shadcn/ui + Radix" y es falso |
| Selects, checkboxes | nativos del navegador (se ven fuera de sistema) |
| Rebrand a mitad de camino | `featureFlags.ts` con 4 flags `NEXT_PUBLIC_UI_REBRAND_*`, `styles/tokens.css` con overrides `!important` por ruta (`.rebrand-automations .text-purple-400 {…}`) para tapar colores viejos |
| Build | Docker multi-stage con `output: 'standalone'` (el `CLAUDE.md` dice lo contrario) |
| Tests | 1 smoke de Playwright con backend mockeado; no hay suite real |
| Dueño del árbol | era `root` (ningún agente podía escribir). **Pasado a `deploy` el 2026-09-05**, los `.env` siguen `root:600` |

## 2. Hallazgos

### 2.1 Seguridad — resolver antes que cualquier rediseño

**El login público tiene un botón "Entrar como Administrador" con credenciales hardcodeadas
(`admin` / `admin1`) en `src/app/login/page.tsx:219`, y funcionan en producción.**
Verificado con `POST /api/auth/login` desde afuera: responde `201` con token. El dominio
`cultivo.ramsesvii.com` no tiene `basic_auth` en Caddy. Cualquier persona que llegue a la URL
entra como admin y puede encender o apagar luces, bombas de riego y humidificadores reales.

Fix: borrar el botón y el texto "Usuario: admin / Contraseña: admin"; cambiar la contraseña del
usuario `admin` en la base (lo decide Juan, es su acceso); revisar que `ADMIN_USER/ADMIN_PASSWORD`
del `.env` del backend sean lo que se usa.

### 2.2 Navegación — el problema estructural

- **Dos "homes" distintos.** `/` es una animación de puerta con selector de sala, botones
  *Admin* y *Salir*. `/sala` es otra home con header y nav. El header lleva siempre a `/sala`,
  así que el usuario nunca vuelve a `/` salvo por URL, y **Admin y Salir solo existen en `/`**.
  No hay menú de usuario ni logout en el resto de la app.
- **Rutas sin shell (callejones sin salida).** `/notificaciones` y `/admin/usuarios` no usan
  el `Header`: cero links de navegación, solo un "Volver". Cada layout de ruta monta su propio
  `Header`; el layout raíz no tiene shell.
- **Sin navegación en móvil.** La nav del header es `hidden md:flex`. En el celular solo queda
  la flecha "atrás" y la campana. Para ir de Ciclos a Dispositivos hay que volver a Sala primero.
- **"Atrás" duplicado.** En Carpa hay flecha en el header **y** un link "Volver a la sala" abajo.
- **Jerarquía confusa.** Sala → Carpa → Planta con "Espacios de cultivo" como panel arriba de
  "Unidades de cultivo"; la selección de sala es un estado local que se pierde.

### 2.3 Diseño y consistencia

- Paleta sin sistema: verde, cyan, violeta, naranja y amarillo mezclados sin semántica
  (tarjetas de carpas con un color cada una, botones primarios a veces verdes, a veces cyan
  degradé, a veces naranjas).
- Dos sistemas de estilo conviven: clases Tailwind hardcodeadas (`bg-zinc-900/80`) y variables
  CSS de `tokens.css` aplicadas por `.ui-rebrand-root`.
- Datos falsos mostrados como reales: en Sala, si falla el clima se ven **0 °C** y **0 %** como
  lecturas junto al aviso "No se pudo obtener el clima".
- Mojibake: "Iniciado el 7/12/2025 **â€¢** 272 días" en Ciclos; 18 ocurrencias de texto mal
  codificado en el código fuente (`est? configurado`, etc.).
- Móvil con overflow horizontal en Ciclos (la página mide 469 px en un viewport de 390) y en
  Admin de usuarios (511 px). Botones "Agregar Planta" y "Registrar Evento" se salen del panel.
- Card de Carpa "Germinadora" con layout distinto a sus hermanas (sin badge, altura distinta).
- Acordeones colapsados por defecto en Carpa (Historial, Plantas, Planes) esconden la
  información principal; el detalle de una carpa muestra primero una ilustración enorme.
- Filtros de notificaciones: en móvil el botón "marcar leídas" queda como un ícono suelto.
- Toda la app usa `max-w-7xl` centrado; en 1440 px queda bien, en pantallas grandes flota.

### 2.4 Funcional (afecta lo que se ve, aunque no es "diseño")

- **Socket.io nunca conecta en producción.** El cliente hace `io(NEXT_PUBLIC_API_URL)` con
  `…/api` en la URL, así que socket.io toma `/api` como *namespace* y pega en `/socket.io`, que
  Caddy manda al frontend Next (solo `/api/*` va al backend). Consola: `Socket connection error:
  timeout`. Todo lo "en tiempo real" cae al polling de 30 s.
- Los microservicios IoT devuelven **500** al pedir estado (Tuya y Sonoff, cada 30 s en el log
  del backend). Por eso Carpa muestra "Sin datos ambientales" y "Dispositivos disponibles"
  está vacío. Probablemente credenciales de eWeLink/Tuya vencidas. Es un problema aparte del
  rediseño pero explica por qué la app "se ve rota".
- **486 notificaciones sin leer**, todas "Alerta Climática: STORM" del clima. La app se genera
  spam a sí misma y el badge vive en "9+".
- El widget de clima falla desde el VPS (fetch a open-meteo desde el browser); en el celular de
  Juan puede andar. Igual necesita un estado vacío honesto.

### 2.5 Botones y acciones

En el recorrido automático no aparecieron errores HTTP ni excepciones de consola al cargar las
páginas (fuera del socket y del clima). Los "errores en botones" que describe Juan están en la
interacción (modales, formularios, acciones dentro de Carpa/Ciclos/Automatizaciones), que el
recorrido de carga no ejercita. La fase 0 arma un test de navegación real que los recorra.

---

## 3. Enfoque recomendado

**Refactor progresivo con shell nuevo primero.** Reescribir la app entera de una es el camino
más caro y el que más rompe. La alternativa que recomiendo:

1. Nuevo **AppShell** en el layout raíz (una sola vez, para todas las rutas): sidebar
   colapsable en desktop, barra de pestañas inferior en móvil, menú de usuario con Admin y
   Salir, campana de notificaciones. Se borran los `Header` por ruta y los layouts duplicados.
2. **Una sola home** en `/`: dashboard operativo (salas y carpas con estado real de sensores,
   alertas activas, ciclos en curso, dispositivos con problema). La animación de puerta se
   retira o queda como transición post-login.
3. **Sistema de diseño único** en `tailwind.config.ts`: tokens semánticos (superficie, borde,
   texto, acento primario verde, colores de estado para sensores: ok / atención / crítico /
   sin dato). Se borran `featureFlags.ts` y `tokens.css`. Se adopta **shadcn/ui** real (Radix)
   para Select, Dropdown, Dialog, Tabs, Sheet, Tooltip: accesibles y consistentes, reemplazan
   los `<select>` nativos.
4. Las tres pantallas monolíticas se **partan en componentes por sección** dentro de sus
   `features/*`, una por fase, manteniendo los hooks y queries que ya existen (esa capa está
   bien resuelta).

Dirección visual propuesta: **modo oscuro sobrio, técnico, de sala de control**. Fondo casi
negro con un solo tono verde de acento, tipografía Manrope / Space Grotesk que ya está,
tarjetas planas con borde fino en vez de glassmorphism y degradés, densidad media, íconos
Lucide. Los colores fuertes quedan reservados para **estado** (sensor fuera de rango, dispositivo
sin conexión), así el ojo va a lo que importa. Ver referencia visual en `01-direccion-visual.md`
cuando se apruebe.

---

## 4. Plan por fases

Cada fase es una o dos delegaciones al agente de `cultivo-admin` (`delegate-agent`, Opus 5,
effort high), con QA visual obligatorio (Playwright, desktop y móvil, navegación real, falla
ante error de consola) y publicación con `app-restart cultivo-frontend --build`.

| Fase | Alcance | Entrega |
|---|---|---|
| **0 · Saneamiento** | Quitar login hardcodeado · arreglar path de socket.io (`path:'/api/socket.io'` + ruta en Caddy, o URL sin `/api`) · corregir mojibake · `CLAUDE.md` del proyecto con el stack real · test Playwright de navegación con login por variables de entorno · pipeline de capturas "antes/después" | App idéntica, segura, con red de seguridad para el resto |
| **1 · Shell + sistema** | AppShell (sidebar / tabbar / menú usuario) · home única `/` · tokens en Tailwind · shadcn/ui · borrar flags y `tokens.css` · Notificaciones y Admin dentro del shell · estados vacíos honestos | La app ya se ve nueva y se navega bien; las pantallas internas siguen con su contenido |
| **2 · Sala y Carpa** | Partir `CarpaDetailPage` · Carpa con tabs (Ambiente · Dispositivos · Plantas · Planes · Historial) · Sala con estado real por carpa · componentes `SensorCard`, `DeviceControlCard`, `PlantCard` al sistema nuevo | Núcleo operativo terminado |
| **3 · Ciclos y plantas** | Partir `SeguimientosPage` · lista de ciclos + detalle · ficha de planta · eventos y cosechas · móvil sin overflow | Gestión de cultivo terminada |
| **4 · Automatizaciones, Dispositivos, Admin** | Partir `AutomatizacionesPage` · editor de reglas · tabla de dispositivos responsive · admin de usuarios en el shell | Resto de pantallas terminadas |
| **5 · Pulido** | Recorrido completo de QA · accesibilidad (foco, contraste, teclado) · carga percibida (skeletons) · docs y `README` | Cierre |

Fuera del plan pero para resolver en paralelo: credenciales Tuya/eWeLink (los 500), el spam
de alertas climáticas, la contraseña del admin.

Costo orientativo: la única delegación previa a esta app (read-only, 149 s) costó US$ 0,91. Una
fase de implementación con build y QA visual se estima entre US$ 15 y 40; el plan completo,
entre US$ 100 y 200. Se cobra al tope de sesión de RAMSES.

---

## 5. Decisiones que necesita Juan

1. **Dirección visual**: la propuesta del punto 3, o prefiere otra (claro, más colorido, etc.).
2. **Alcance**: plan completo (fases 0-5) o solo 0 + 1 para evaluar antes de seguir.
3. **Contraseña del admin**: la cambia él, o autoriza a que se genere una nueva y se le pase
   por canal privado.
