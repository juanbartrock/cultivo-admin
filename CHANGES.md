# CHANGES.md — cultivo-admin

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
