# CHANGES.md — cultivo-admin

<!-- [agent:cultivo-admin][date:2026-09-08][action:modified] -->
## 2026-09-08 — Hallazgos 1, 3, 5, 7, 8 y 10 del crítico (rama `redisenio-2026-09`)

Correcciones sobre el informe `docs/critica/2026-09-08-0745/informe.md`. El hallazgo 2 (rangos
ok/warn/danger en `readings.ts`) queda pendiente de una decisión de esquema de Juan; los
hallazgos 4, 6, 9 y 11 son de fases posteriores o de fuera del alcance del rediseño.

- **#1 · overflow horizontal en móvil.** `/seguimientos`: el encabezado del ciclo pasa a
  `flex-col sm:flex-row`, el nombre y el select del estado envuelven, y los botones "Agregar
  Planta" y "Registrar Evento" ocupan la fila completa abajo de 640 px. `/admin/usuarios`: la
  fila de usuario apila datos y acciones en móvil, el avatar es `shrink-0`, el mail corta con
  `break-all` y los contadores envuelven. Red de seguridad del shell: `main` con
  `overflow-x-hidden`. Salen los dos `test.fixme` de `frontend/tests/qa-nav.spec.ts`.
- **#3 · lectura stale con sensor offline.** `sectionReadings()` devuelve las tres métricas en
  `null` y `sensorOffline: true` cuando el backend informa `online: false`, en vez de arrastrar
  el último valor que vio el conector. La tarjeta de carpa muestra `—` en gris y un badge
  "Sensor sin respuesta"; ya no aparece un 18,1 °C en rojo mientras las alertas dicen que el
  sensor está caído.
- **#5 · encabezado de carpa durante la carga.** `CarpaDetailPage` monta `PageHeader` también en
  los estados de carga y error, con título provisorio "Carpa" y breadcrumb a `/sala`, así la
  barra superior de móvil trae la flecha atrás desde el primer render.
- **#7 · código muerto de la home vieja.** Borrados `components/dashboard/` (DashboardSummary,
  AlertsList, QuickActions, StatsGrid), `components/WeatherWidget.tsx` y
  `services/weatherService.ts` — con ellos se va el único `max-w-7xl` del árbol. `useWeather`
  arranca con `temperature`/`humidity` en `null` y `OutdoorWeatherBlock` los formatea con
  `formatReading` (guion, no cero).
- **#8 · bloque Alertas.** `useDevicesStatus` expone `lastUpdate`; "Todo en rango" pasa a "Todo
  en rango · actualizado hace N s" y con alertas la antigüedad va en el encabezado de la
  sección (`frontend/src/features/home/lib/timeAgo.ts`). Las alertas apilan carpa y etiqueta en
  dos líneas en móvil en vez de truncar. El "Actualizar" queda en `PageHeader`, ahora alineado
  a la derecha en todos los anchos.
- **#10 · doble `<h1>`.** La barra superior de móvil usa `<p role="heading" aria-level={1}>`; el
  único `<h1>` del documento lo pone `PageHeader`. En móvil ese `h1` está oculto por CSS y sale
  del árbol de accesibilidad, así que cada viewport anuncia un encabezado y uno solo. Un
  chequeo que busque `header h1` en móvil ahora tiene que mirar `header [role=heading]`.
  Con el título fuera de `<h1>`, las páginas que salteaban `PageHeader` quedaban en cero
  encabezados: `/automatizaciones` vacía era el caso vivo en producción. Los estados de carga,
  error y vacío de `/automatizaciones`, `/seguimientos`, `/sala` y `/admin/usuarios` montan
  `PageHeader`, y los `<h1>` sueltos de esos estados de error pasan a `<p>`.

Verificación: `npm run typecheck`, `npm run lint` y `npm run build` en exit 0 sin warnings
nuevos (25 → 24, se va el de `DashboardSummary`); `npm run qa:nav` 17/17 sin skipped;
navegación real en 390×844 y 1440×900 contra producción con sesión de admin — `scrollWidth`
390 y un solo `<h1>` en las siete rutas más la carpa, `tap()` en "Más" desde `/seguimientos` y
`/admin/usuarios` sin `force`, carpa con flecha atrás y título "Carpa" a los 300 ms, tarjetas
de Vegetativo y Secado en `—` sin `text-danger`/`text-warn`, y "Todo en rango · actualizado
hace 0 s" forzando una respuesta de `/api/sections` sin sensores. Publicado con
`app-restart cultivo-frontend --build` (exit 0).

<!-- [agent:server-audit][date:2026-09-08][action:created] -->
## 2026-09-08 — Rúbrica del crítico de calidad (piloto de `critic-agent`)

Cultivo Admin es el piloto del evaluador independiente del ecosistema. Nuevo
`docs/rubrica-critico.md`: umbral 8.0 y piso 6.0, mínimos de la app, pesos por dimensión
(UI y correctitud 3, seguridad y código 2, entrega 1), anclas propias de UI según el brief
`docs/rediseno-2026-09/01-direccion-visual.md`, checks que corre el crítico (typecheck, lint,
build, QA navegado en móvil y desktop contra producción con la credencial de admin) y fallas
duras propias (scroll horizontal móvil, degradés o blur, ceros como lectura, credencial
hardcodeada, IoT con puertos al host). Los informes y capturas del crítico quedan en
`docs/critica/<fecha-hora>/` con symlink `docs/critica/ultimo`. Sin cambios de código.
Detalle en `/opt/server-audit/docs/critic-agent.md`.

<!-- [agent:cultivo-admin][date:2026-09-05][action:modified] -->
## 2026-09-05 — Fase 1 del rediseño: shell, sistema de diseño y home única (rama `redisenio-2026-09`)

- **Sistema de diseño**: los tokens de `docs/rediseno-2026-09/01-direccion-visual.md` viven en
  `frontend/src/app/globals.css` (`:root`, canales RGB) y se exponen en `tailwind.config.ts`
  (`bg`, `surface`, `surface-2`, `surface-3`, `edge`, `edge-strong`, `fg`, `fg-muted`, `fg-faint`,
  `accent{,-hover,-fg,-soft}`, `ok`, `warn`, `danger`, `info`, `offline`; radios 6/10/14; una sola
  sombra `shadow-float`). Eliminados `src/lib/featureFlags.ts`, `src/styles/tokens.css` y todas las
  clases `ui-rebrand-*`, `rebrand-*`, `surface-panel*`, `btn-accent` y `btn-data`.
- **shadcn/ui sobre Radix instalado** con su CLI (`shadcn@2.10.0`, la línea compatible con
  Tailwind 3.4 y Next 14; `latest` arranca en Tailwind 4): button, badge, card, input, label,
  select, checkbox, switch, tabs, dialog, sheet, dropdown-menu, tooltip, table, skeleton,
  separator y scroll-area, mapeados a los tokens. Dependencias nuevas: `@radix-ui/*`,
  `class-variance-authority`, `tailwindcss-animate`. Los componentes propios que los duplicaban
  (`Badge`, `Button`, `Card`, `Modal`, `Skeleton`) se eliminaron; `Modal`, `ConfirmDialog` y
  `EmptyState` se reescribieron sobre `Dialog` y los tokens.
- **AppShell** (`frontend/src/components/shell/`) montado una sola vez en `src/app/layout.tsx`:
  sidebar de 240 px colapsable a 64 px con estado en `localStorage`, menú de usuario con cierre de
  sesión, barra superior de 56 px y barra de 5 pestañas con `Sheet` de "Más" en móvil, y
  `PageHeader` con breadcrumb. El contador de notificaciones sin leer es una sola consulta del
  shell, con refresco por el evento `alert` del socket o cada 60 s. Se eliminaron
  `Header.tsx`, `NotificationDropdown.tsx` y los `layout.tsx` de `sala`, `seguimientos`,
  `automatizaciones`, `artefactos` y `notificaciones`. `/notificaciones` y `/admin/usuarios`
  dejaron de ser callejones sin salida.
- **Home única en `/`** (`frontend/src/features/home/`): alertas por carpa, tarjetas de carpa con
  temperatura, humedad y VPD con color de estado, ciclos activos, dispositivos sin respuesta y
  clima exterior. Sin dato es `—`, nunca un cero; cada bloque cae solo con banner `warn` y
  "Reintentar". Se eliminó `DoorAnimation`. Sin cambios en el backend.
- **`/sala`**: el panel "Espacios de cultivo" se reemplazó por un `Select` en el `PageHeader`, y
  la sala elegida queda en la URL como `?sala=<id>` (`roomId` se sigue aceptando).
- **Barrido de consistencia**: los `<select>` nativos de primer nivel (Ciclos, Dispositivos,
  Notificaciones) pasaron al `Select` de shadcn; login, registro, toasts, chat del asistente y
  modales de Sala migrados a los tokens, sin degradés de marca ni `backdrop-blur`.
- **Publicación y QA**: `app-restart cultivo-frontend --build` exit 0;
  `QA_LABEL=fase1 npm run qa:nav` 15 passed / 2 skipped, exit 0. Los dos `test.fixme` de overflow
  móvil siguen y su motivo ahora incluye la medición de la fase 1: el desborde lo causa el
  contenido interno de Ciclos (469 px) y de Usuarios (511 px), no el shell. Capturas en
  `docs/rediseno-2026-09/capturas/fase1/` (34 PNG). Reporte:
  `docs/rediseno-2026-09/03-reporte-fase1.md`.

<!-- [agent:cultivo-admin][date:2026-09-05][action:modified] -->
## 2026-09-05 — Fase 0 del rediseño: saneamiento (rama `redisenio-2026-09`)

- **Login**: se eliminó el botón "Entrar como Administrador" con credenciales en el código,
  el separador de acceso rápido y el texto que publicaba usuario y contraseña
  (`frontend/src/app/login/page.tsx`). El formulario de email + contraseña queda igual.
- **Socket.io**: el gateway pasa a escuchar en `path: '/api/socket.io'`
  (`backend/src/modules/realtime/realtime.gateway.ts`) y el cliente conecta al origin de
  `NEXT_PUBLIC_API_URL` sin el sufijo `/api` con ese mismo path
  (`frontend/src/contexts/SocketContext.tsx`). El socket ahora se abre sólo con token de sesión
  (`access_token`, antes leía `auth_token`, clave que nunca se escribía) y se reconecta cuando
  cambia la autenticación.
- **Encoding**: corregidas todas las ocurrencias de mojibake ("â€¢", "Ã³", "âš ï¸") y de acentos
  perdidos como "?" en `frontend/src`, `frontend/tests` y `backend/src`; quitado el BOM UTF-8 de
  34 archivos.
- **CLAUDE.md**: Nivel 2 corregido — no hay shadcn/ui ni Radix (componentes propios en
  `src/components/ui/`), el build usa `output: 'standalone'`, los tres microservicios IoT
  escuchan en el puerto 3000 de su contenedor. Nivel 4 documenta los `.env` como
  `deploy:deploy 600` y la publicación con `app-restart cultivo-frontend|cultivo-backend --build`.
- **QA**: nuevo recorrido de navegación en `frontend/tests/` (`qa-nav.spec.ts`,
  `qa-nav.setup.ts`, `qa-nav.shared.ts`) con `frontend/playwright.qa.config.ts` (proyectos
  `desktop` 1440×900 y `mobile` 390×844, sin `webServer`). El setup loguea por el formulario y
  el recorrido visita home, sala, la primera carpa, ciclos, automatizaciones, artefactos,
  notificaciones y admin de usuarios; falla ante `console.error`, `pageerror` o HTTP >= 500 y
  guarda capturas en `docs/rediseno-2026-09/capturas/<QA_LABEL>/`. En móvil verifica el ancho
  contra el viewport configurado; Ciclos (469px) y Admin de usuarios (511px) quedan en
  `test.fixme` para las fases 3 y 4. Script: `npm run qa:nav` en `frontend/`. Credenciales desde
  `CULTIVO_ADMIN_USER` / `CULTIVO_ADMIN_PASSWORD`
  (`/home/deploy/.config/secrets/cultivo-admin-login.env`, fuera del repo).
- **Login**: el campo de usuario pasa de `type="email"` a `type="text"` ("Email o usuario"). El
  backend autentica por `username` y el usuario `admin` no es un email, así que la validación
  del navegador bloqueaba el envío del formulario.

<!-- [agent:server-audit][date:2026-09-05][action:created] -->
## 2026-09-05 — Diagnóstico para el rediseño de la UI

- `docs/rediseno-2026-09/00-diagnostico-y-plan.md`: hallazgos (seguridad, navegación, diseño,
  funcional) y plan por fases. Capturas del estado actual en `capturas/antes/`.
- Árbol del proyecto pasado de `root` a `deploy:deploy` para que los agentes puedan escribir.
  Los `.env` de backend y microservicios siguen `root:600`.
- Hallazgo crítico pendiente de Juan: botón de login con credenciales hardcodeadas en
  `frontend/src/app/login/page.tsx` que funciona en producción.

<!-- [agent:codex][date:2026-09-05][action:modified] -->
## 2026-09-05 — Contexto compartido para Astra

Sincronizado `ecosystem-context` desde `/opt/server-audit/ECOSYSTEM.md`: autonomía dentro del
alcance autorizado, vigencia de aprobaciones, prioridad de instrucciones y verificación
proporcional. Los cambios documentales se verifican sin build ni reinicio. Se conservan los
límites sobre infraestructura compartida. Registro y validación global en
`/opt/server-audit/CHANGES.md`; comprobación: `sync-agent-context --check`.


Historial de modificaciones realizadas por agentes sobre los archivos de este proyecto.

---

## 2026-02-27

### [agent:server-audit] Creación de CHANGES.md
- **Archivo:** `CHANGES.md` (este archivo)
- **Acción:** Creado — formato estándar de historial del servidor
- **Motivo:** El Nivel 6 de CLAUDE.md referencia este archivo para que los subagentes registren sus cambios

### [agent:server-audit] Agregar Nivel 6 a CLAUDE.md
- **Archivo:** `CLAUDE.md`
- **Acción:** Agregada sección "Nivel 6 — Operación como Subagente" al final del archivo
- **Motivo:** Alinear con el patrón estándar de todos los proyectos del servidor (openclaw, finanzia, panel)
