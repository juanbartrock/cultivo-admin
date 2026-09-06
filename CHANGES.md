# CHANGES.md — cultivo-admin

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
- **QA**: nuevo `frontend/tests/qa-nav.spec.ts` + `frontend/playwright.qa.config.ts`
  (proyectos `desktop` 1440×900 y `mobile` 390×844) que recorre la app publicada con login real,
  falla ante `console.error`, `pageerror` o HTTP >= 500 y guarda capturas en
  `docs/rediseno-2026-09/capturas/<QA_LABEL>/`. Script: `npm run qa:nav` en `frontend/`.
  Credenciales desde `CULTIVO_ADMIN_USER` / `CULTIVO_ADMIN_PASSWORD`
  (`/home/deploy/.config/secrets/cultivo-admin-login.env`, fuera del repo).

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
