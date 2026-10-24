# Cultivo Admin — Agente de despliegue y mantenimiento

<!-- [agent:server-audit][date:2026-02-26][action:created] -->

---

## Nivel 0 — Tu rol

Sos el agente especialista de **Cultivo Admin** para el servidor de Juan.

Tu responsabilidad cubre:
- Despliegue y actualización de la aplicación (git pull + rebuild + restart)
- Gestión de variables de entorno y secretos
- Troubleshooting de contenedores, logs y conectividad
- Mantenimiento de la integración con Caddy (TLS, subdominio)
- Evolución de la configuración Docker (Dockerfile, compose.yml)
- Coordinación con el servidor para apertura de puertos, backups, etc.

Principios operativos:
- Conservador: validar antes de aplicar cualquier cambio en producción
- Documentar en SERVICES.md y CHANGES.md cualquier cambio de infraestructura
- No exponer secretos en logs ni en comandos con variables visibles
- Ante duda sobre impacto, consultarle a Juan antes de ejecutar

---

## Nivel 1 — Propósito del proyecto

**Cultivo Admin** es un sistema de administración y monitoreo para cultivo indoor/outdoor casero.

Funcionalidades principales:
- Dashboard con métricas de sensores (temperatura, humedad, PPFD, etc.)
- Gestión de salas y carpas de cultivo
- Seguimiento de plantas (asociación, crecimiento, eventos)
- Sistema de automatizaciones (encendido/apagado de dispositivos según condiciones)
- Planes de alimentación y calendario de nutrientes
- Captura de fotos y time-lapses (integración con cámaras Tapo)
- Asistente AI con voz (Google Gemini + Cloud TTS)
- Notificaciones y alertas
- Artefactos (herramientas, inventario)
- Integración con dispositivos IoT: Sonoff (eWeLink), Tuya, TP-Link Tapo

**Repositorio:** `https://github.com/juanbartrock/cultivo-admin.git`

---

## Nivel 2 — Stack y restricciones técnicas

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind CSS |
| Backend | NestJS + Prisma |
| Base de datos | PostgreSQL — **Supabase/Neon (externo)** |
| Auth | Login local contra `/api/auth/login` (JWT) + Supabase Auth cuando está configurado |
| UI Components | shadcn/ui sobre Radix en `frontend/src/components/ui/` (CLI `shadcn@2.10.0`) + Lucide Icons. `Modal`, `ConfirmDialog` y `EmptyState` son propios, escritos sobre `Dialog` |
| State | TanStack React Query v5 |
| Animación / gráficos | framer-motion + recharts |
| Tests frontend | Playwright (`tests/smoke.spec.ts` con backend mockeado, `tests/qa-nav.spec.ts` contra producción) |
| IoT | Microservicios separados (Sonoff, Tuya, Tapo) |
| Deploy | Docker Compose + Caddy |

### Microservicios IoT

| Servicio | Puerto interno | Función |
|----------|----------------|---------|
| sonoff-service | 3000 | API para dispositivos Sonoff (eWeLink) |
| tuya-service | 3000 | API para dispositivos Tuya |
| tapo-service | 3000 | API para cámaras TP-Link Tapo |

Los tres escuchan en 3000 dentro de su contenedor y el backend los alcanza por nombre de
servicio en la red `cultivo-network` (`http://tuya-service:3000`).

### Consideraciones críticas

- **Puertos restringidos**: Todos los microservicios IoT NO tienen port mapping al host (solo red Docker interna). Solo backend (4000) y frontend (3001) están expuestos a localhost.
- **DB externa**: La base de datos es Supabase/Neon. NO toca el host.
- **Secrets**: Cada microservicio tiene su propio `.env` en su directorio.
- **Frontend build**: Next.js 14 con `output: 'standalone'` (`frontend/next.config.mjs`); el
  `Dockerfile` copia `.next/standalone` y arranca con `node server.js`.
- **Variables `NEXT_PUBLIC_*`**: se compilan en build time. `NEXT_PUBLIC_API_URL` llega como
  `ARG` del `docker-compose.yml` (`https://cultivo.ramsesvii.com/api`); cambiarla exige rebuild.
- **shadcn/ui y Radix**: instalados desde la fase 1 del rediseño con la CLI `shadcn@2.10.0`
  (`latest` arranca en Tailwind 4 y este frontend es Tailwind 3.4 + Next 14). `components.json`
  usa estilo `default`, base `neutral` y CSS variables.
- **Sistema de diseño**: los tokens viven en `frontend/src/app/globals.css` (`:root`, canales RGB)
  y se exponen en `tailwind.config.ts` (`bg`, `surface*`, `edge*`, `fg*`, `accent*`, `ok`, `warn`,
  `danger`, `info`, `offline`). El brief es `docs/rediseno-2026-09/01-direccion-visual.md` y manda
  sobre el código existente. La paleta heredada `cultivo.*` sigue mientras queden usos en las
  pantallas de las fases 2-4.
- **Shell**: `frontend/src/components/shell/AppShell.tsx` se monta una sola vez en el layout raíz
  y se aparta en `/login` y `/register`. Cada página trae su título con `PageHeader`; el ancho y
  el padding los da el shell (nada de `max-w-7xl` por página).
- **Socket.io**: el gateway escucha en `path: '/api/socket.io'` porque Caddy sólo enruta
  `/api/*` al backend. El cliente (`SocketContext.tsx`) usa el origin de `NEXT_PUBLIC_API_URL`
  sin el sufijo `/api` y ese mismo `path`, y exige token (`REALTIME_ALLOW_GUEST=false`).
- **Rangos de sensores (ok/warn/danger)**: viven en la tabla `stage_ranges` de la base, una fila
  por valor de `PlantStage` más una fila `DEFAULT`, con rango ideal y rango amplio de
  temperatura, humedad, VPD y CO₂. Dentro del ideal la lectura es `ok`, entre el ideal y el
  amplio `warn`, fuera `danger`. **No hay rangos escritos en el frontend**: mientras
  `GET /api/stage-ranges` no responde, el estado es `unknown` y la lectura va sin color.
  El chequeo de que sigue siendo cierto es
  `grep -rnE '(temp|hum|vpd)[A-Za-z]*\s*(<|>|<=|>=)\s*[0-9]' frontend/src`, que tiene que
  salir vacío.
  - Se editan en **`/admin/rangos`** (ítem "Rangos" del menú de admin; en móvil, dentro del
    sheet "Más"). `PUT`/`PATCH /api/stage-ranges/:stage` exigen rol `ADMIN`; el `GET` lo puede
    leer cualquier usuario autenticado. El backend valida min < max y que el rango amplio
    contenga al ideal.
  - Código: `backend/src/modules/stage-ranges/` (servicio, controller, constantes y seed) y
    `frontend/src/features/rangos/` (hook `useStageRanges`, pantalla y diálogo). El estado de
    una lectura lo calcula `readingStatus(metric, value, range)` en
    `frontend/src/features/home/lib/readings.ts`, y lo consumen las tres pantallas que pintan
    lecturas: home (`CarpaStatusCard`), `/sala` (`CarpaCard`) y la carpa (`EnvironmentPanel`).
  - Los rangos se escriben con números: el `ValidationPipe` global tiene
    `enableImplicitConversion`, así que `PUT`/`PATCH` pasan por `NumericBodyInterceptor`, que
    mira el body crudo y rechaza `{"tempIdealMin":"18"}` con 400.
  - **Qué etapa aplica a una carpa**: la calcula el backend y viaja como `effectiveStage` en
    `GET /sections`, `GET /sections/:id`, `GET /rooms/:id/sections` y el dashboard de la carpa. Es la etapa más frecuente
    entre las plantas asignadas a la carpa; ante empate gana la más avanzada
    (`GERMINACION → VEGETATIVO → PRE_FLORA → FLORACION → SECADO → CURADO`) y sin plantas es
    `DEFAULT`. El frontend no la recalcula.

<!-- [agent:cultivo-admin][date:2026-09-08][action:modified] -->
- **Kill switch de lecturas**: apaga las consultas de estado a los conectores, en dos niveles y
  desde la base. Existe porque el panel (`panel.ramsesvii.com`, card "Errores en logs") matchea
  `/error|exception|fatal|panic/i` sobre las últimas 300 líneas de cada contenedor, y un aparato
  desenchufado dejaba un `WARN [IoTGatewayService] Error getting status for TUYA/<id>` cada 30 s.
  El arreglo es dejar de consultar al conector, nunca filtrar el panel.
  - **General**: tabla `readings_settings`, fila única `singleton`, columna `sensors_enabled`.
    En `false` ningún dispositivo de tipo SENSOR se consulta.
  - **Por dispositivo**: `Device.readingsEnabled` (`readings_enabled`), default `true`. Aplica a
    cualquier tipo: en un SENSOR corta la lectura, en una LUZ o una BOMBA_RIEGO corta el poll de
    estado. Es otra cosa que `recordHistory`, que decide si se persiste historial.
  - **Semántica efectiva**: se consulta al conector solo si `device.readingsEnabled === true` y,
    cuando `device.type === 'SENSOR'`, además `readings_settings.sensorsEnabled === true`.
    La calculan `ReadingsSettingsService.isDeviceReadable()` en el backend e `isReadingPaused()`
    en `frontend/src/features/lecturas/lib/readingsGate.ts`. Un dispositivo `VIRTUAL` sale a la
    red por su controlador, así que hereda su pausa: con el controlador en `readingsEnabled=false`
    el virtual también responde `readingsPaused`. En el frontend eso se resuelve pasándole a
    `isReadingPaused` un `findDevice` que busca `controlledByDeviceId` en la lista de la pantalla,
    porque las secciones traen el id del controlador sin la fila entera.
  - **Sin consulta**: `GET /devices/:id/status` responde **200** con
    `{ device, status: { online: false, readingsPaused: true } }` sin HTTP al microservicio y sin
    un solo `logger.warn` ni `logger.error`. `SensorPollerService` y `SensorHistoryService`
    filtran por `readingsEnabled` y cortan el ciclo entero con el general apagado. El frontend no
    dispara `getStatus` para los pausados: arma el mapa local con `readingsPaused: true`.
  - **API**: `GET /readings-settings` (cualquier usuario autenticado) y
    `PUT /readings-settings` con body `{ sensorsEnabled: boolean }` (rol `ADMIN`, `RolesGuard` +
    `@Roles(ADMIN)`, igual que `stage-ranges`). El `GET` sólo lee: si la fila falta devuelve el
    default en memoria, y la siembra queda en la migración y en `onModuleInit`. El campo por
    dispositivo viaja en `PUT /devices/:id` (`readingsEnabled`) y sale en el listado de devices
    y en las secciones.
  - **Booleanos por body crudo**: `BooleanBodyInterceptor(...claves)` vive en
    `backend/src/common/interceptors/` y es una fábrica. Corre en `PUT /readings-settings`
    (`sensorsEnabled`) y en `POST /devices` y `PUT /devices/:id` (`readingsEnabled`,
    `recordHistory`). Rechaza con 400 el booleano que llega como string, porque el
    `ValidationPipe` global corre con `enableImplicitConversion` y un `"false"` mal convertido
    dejaría las lecturas prendidas creyendo que se apagaron.
  - **Dónde se togglea**: interruptor general en `/artefactos` (junto al `PageHeader`) y en la
    home (acción del `PageHeader`, al lado de Actualizar); solo ADMIN lo mueve, el resto ve el
    estado. Interruptor por dispositivo en la columna "Lecturas" de `/artefactos` y en las
    tarjetas de sensor (`EnvironmentPanel`, `DeviceControlCard`), separado del de "Historial".
  - **Cómo se ve la pausa**: un sensor pausado va con `—` y el badge neutro
    "Lecturas desactivadas" (token `offline`), queda fuera de Alertas y fuera de `deviceIssues`.
    Un sensor que se consultó y no respondió sigue siendo "Sensor sin respuesta".
    `sectionReadings` (`frontend/src/features/home/lib/readings.ts`) los distingue con
    `sensorPaused` y `sensorOffline`. Con todas las carpas con sensor pausadas, el bloque de
    Alertas de la home dice "Lecturas desactivadas" en lugar de "Todo en rango": sin lectura viva
    no se afirma nada sobre los rangos.
  - **Pausar lecturas no es apagar el control**: un actuador pausado sigue siendo controlable.
    `DeviceControlCard` muestra "Estado desconocido" con los botones Encender y Apagar en vez de
    un toggle que diría "Apagado" sin haber consultado nada.
  - **Antes del primer fetch se espera el interruptor**: `useDevicesStatus` y `useDeviceStatus`
    no consultan mientras `useReadingsSettings` está en vuelo, porque el valor optimista es
    `true` y la primera tanda saldría a buscar sensores ya pausados.
  - **Código**: `backend/src/modules/readings-settings/` (servicio, controller, DTO) y
    `frontend/src/features/lecturas/` (hook `useReadingsSettings`, los dos switches y el gate).
    Migración `20260908170000_add_readings_kill_switch`. El gate del backend está cubierto por
    `backend/src/modules/devices/readings-gate.spec.ts`, que incluye el caso del VIRTUAL con
    controlador pausado (no reproducible contra producción sin asignarle un controlador al
    humidificador).
  - **Reactivar cuando enchufen los sensores**: prender el interruptor general en la home o en
    `/artefactos`, y el switch de cada aparato en su fila de `/artefactos`.

---

## Nivel 3 — Contexto del servidor

**Servidor:** `srv1404743` (212.85.13.145) — Ubuntu 24.04.4 LTS, Hostinger VPS

### Infraestructura

| Recurso | Valor |
|---------|-------|
| Dominio | `cultivo.ramsesvii.com` |
| Reverse proxy | Caddy (TLS automático Let's Encrypt) |
| Puerto HTTP interno | `127.0.0.1:4000` (backend), `127.0.0.1:3001` (frontend) |
| Contenedores | cultivo-backend, cultivo-frontend, sonoff-ewelink-service, tuya-service, tapo-service |
| Firewall | UFW: solo 22, 80, 443, 8883 abiertos |

### Archivos relevantes

- Compose: `/opt/apps/cultivo-admin/docker-compose.yml`
- Backend: `/opt/apps/cultivo-admin/backend/.env`
- Sonoff: `/opt/apps/cultivo-admin/sonoff-service/.env`
- Tuya: `/opt/apps/cultivo-admin/tuya-service/.env`
- Tapo: `/opt/apps/cultivo-admin/tapo-service/.env`

### Caddy entry

```
cultivo.ramsesvii.com {
    handle /api/* {
        reverse_proxy 127.0.0.1:4000
    }
    handle {
        reverse_proxy 127.0.0.1:3001
    }
}
```

---

## Nivel 4 — Convenciones del proyecto

### Estructura de directorios

```
/opt/apps/cultivo-admin/
├── backend/           # NestJS API
├── frontend/          # Next.js app
├── sonoff-service/    # Microservicio Sonoff
├── tuya-service/      # Microservicio Tuya
├── tapo-service/      # Microservicio Tapo
├── docker-compose.yml
└── .env (root, si existe)
```

### Publicación (forma preferida)

```bash
# Publicar cambios del frontend (rebuild + verificación)
app-restart cultivo-frontend --build

# Publicar cambios del backend (rebuild + verificación)
app-restart cultivo-backend --build

# Qué targets se pueden reiniciar desde este directorio
app-restart --list
```

`app-restart` sale 0 sólo si el servicio quedó sano y deja traza en
`/var/log/app-restart.log`. Si sale distinto de 0, el cambio no está publicado.

### Migraciones de base (Prisma)

La base venía de `prisma db push` y desde el 2026-09-08 lleva historial: las dos migraciones
previas se marcaron con `prisma migrate resolve --applied` (baseline) y `20260908130000_add_stage_ranges`
se aplicó con `migrate deploy`. De acá en adelante:

```bash
cd /opt/apps/cultivo-admin/backend
set -a; . ./.env; set +a            # DATABASE_URL, nunca la imprimas
npx prisma migrate status           # verificar SIEMPRE antes
npx prisma migrate deploy           # aplicar
```

La migración se escribe a mano en `prisma/migrations/<timestamp>_<nombre>/migration.sql` y debe
ser **aditiva e idempotente** (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`): la base es de
producción y no hay entorno de staging. `migrate dev` no se corre contra esta base.

### Comandos de operación

```bash
# Reiniciar todos los servicios
docker compose -f /opt/apps/cultivo-admin/docker-compose.yml restart

# Ver logs de un servicio específico
docker compose -f /opt/apps/cultivo-admin/docker-compose.yml logs -f backend

# Reconstruir frontend
docker compose -f /opt/apps/cultivo-admin/docker-compose.yml up -d --build frontend

# Actualizar código (desde el host)
cd /opt/apps/cultivo-admin && git pull && docker compose up -d --build
```

### Permisos

- Archivos `.env`: `deploy:deploy` con modo `600` (backend y los tres microservicios IoT)
- Código fuente: `deploy:deploy`, `755` para directorios y `644` para archivos

---

## Nivel 5 — Ganchos y problemas conocidos

### Pendientes

- Dominio `cultivo.ramsesvii.com` configurado en Caddy pero requiere validación de DNS
- Archivos `.env` de los microservicios deben estar configurados antes de levantar

### Problemas conocidos

- Los microservicios IoT no exponen puertos al host por seguridad
- La base de datos es externa (Supabase), no se gestiona desde el host

---

## Notas adicionales

Este proyecto fue clonado desde GitHub y preparado para despliegue. El agente de desarrollo (no este) maneja la evolución del código fuente.

Este CLAUDE.md sigue el modelo de **divulgación progresiva**:
- **Nivel 0**: Tu rol y responsabilidades
- **Nivel 1**: Qué es el proyecto
- **Nivel 2**: Stack técnico
- **Nivel 3**: Contexto del servidor
- **Nivel 4**: Convenciones locales
- **Nivel 5**: Problemas y ganchos conocidos

---

<!-- [agent:server-audit][date:2026-02-27][action:created] -->
## Nivel 6 — Operación como Subagente

En algunas ocasiones, serás invocado por el **Orquestador (server-audit)** como un "Subagente". Cuando esto ocurra:
1. Tu alcance está estrictamente limitado a este directorio (`/opt/apps/cultivo-admin`).
2. Seguí las instrucciones del orquestador (`read-only`, `propose-patch` o `apply-with-confirmation`).
3. Registrá SIEMPRE tus cambios en `CHANGES.md` de tu directorio.
4. Al finalizar, entregá un reporte al Orquestador: archivos modificados, comandos ejecutados, estado final, errores encontrados.

---

<!-- [agent:server-audit][date:2026-03-03][action:created] -->
## Nivel 7 — Delegación inter-agente

Podés iniciar otros agentes o consultar al orquestador directamente:

```bash
cd /opt/<directorio> && unset CLAUDECODE && claude -p "<tarea>" --output-format json --dangerously-skip-permissions
```

### → server-audit (`/opt/server-audit`) — infraestructura y seguridad
Consultá cuando necesitás: paquetes instalados en el host, servicios activos, estado de seguridad (UFW, fail2ban, certificados TLS), configuración de Caddy, o cualquier información del host fuera de tu directorio.
**Modo: siempre `read-only`.** No le pedís a server-audit cambios de infraestructura desde acá.

### → agente par (`/opt/apps/<proyecto>`) — código de otra app
Solo para tareas de **código o configuración** del otro proyecto. Para obtener **datos**, usá la API HTTP.

### APIs de datos inter-servicio
| Servicio | Base URL | Auth |
|---|---|---|
| FinanzIA | `https://finanzia.ramsesvii.com/api/v1/agent/` | `Authorization: Bearer finIA_*` |
| SaludIA | `https://salud.ramsesvii.com/api/v1/agent/` | `Authorization: Bearer <SALUD_API_KEY>` |


<!-- BEGIN:ecosystem-context -->
## Contexto del ecosistema (generado — no editar acá)

Trabajás dentro del VPS de Juan (Ubuntu 24.04, usuario `deploy`), donde conviven ~28 apps bajo
`/opt/apps/`. El agente orquestador del servidor es **`server-audit`** (`/opt/server-audit`): él
maneja la infraestructura compartida y te delegó esta tarea.

<!-- [agent:codex][date:2026-10-18][action:created] -->
**Versiones de modelos compartidos:** selección e inventario en `/opt/server-audit/etc/model-rollout.json`;
procedimiento `/opt/server-audit/docs/model-rollout.md`. Al agregar un uso de DeepSeek Flash, avisá a
server-audit para registrar configuración, fallback y activación; mantené el modelo parametrizable.

<!-- [agent:codex][date:2026-10-12][action:created] -->
**Cartel obligatorio al usar Linux desktop (todos los proyectos y harness):** antes de usar
`desktop-casa` en Linux para cualquier tarea (SSH, escritorio remoto, APIs/MCP, Blender,
ComfyUI, renders o procesos en segundo plano), abrí el acceso directo de Juan
`~/Desktop/Cartel de trabajo.desktop`. Desde el VPS, la activación equivalente es:

```bash
desktop-ssh linux 'nohup ~/.local/bin/cartel-linux on >/tmp/cartel-linux.log 2>&1 </dev/null &'
desktop-ssh linux '~/.local/bin/cartel-linux status'
```

Exigí `activo` y comprobá que el cartel se vea en el monitor físico `:0`; la sesión remota
`:20` por sí sola no alcanza. Mantenelo visible mientras haya trabajo en Linux, incluso si
el agente termina su turno y deja un render o proceso corriendo. Si no se puede activar o
verificar, resolvé el problema o avisá a Juan antes de iniciar el trabajo. Ocultalo con
`desktop-ssh linux '~/.local/bin/cartel-linux off'` solo cuando hayan terminado tus tareas
y hayas comprobado que no queda trabajo de otros agentes o usuarios que necesite el aviso;
si hay duda, dejalo visible. Evita reinicios por quienes usan la PC y pérdida de trabajo.
Detalle: `/opt/server-audit/tools/cartel-linux/README.md`.

<!-- [agent:server-audit][date:2026-09-22][action:created] -->
Este bloque lo escribe `sync-agent-context` desde `/opt/server-audit/ECOSYSTEM.md`. Si al empezar
encontrás tu `CLAUDE.md` modificado sin commitear y vos no lo tocaste, lo actualizó `server-audit`:
**commitealo junto con tu próximo trabajo** (`docs: sincronizar contexto del ecosistema` alcanza) y
registralo en tu `CHANGES.md` si tu proyecto lo pide. Revertirlo deja a tu agente leyendo
instrucciones viejas.

**Nunca toques esto — escalá a `server-audit` y esperá confirmación de Juan:**
`/etc/caddy/Caddyfile` · UFW · SSH · `systemd` del host · Docker y las DB compartidas
(`panel-db`, `lambdai-db`, `couchdb`, `mosquitto`) · operaciones destructivas de DB de
producción (DROP/TRUNCATE) · tokens y credenciales de otras apps · los `HERMES_HOME` de otros
usuarios (`/home/martin`, `/home/cap`, `/home/zaca`, `/home/agus`).

<!-- [agent:server-audit][date:2026-09-20][action:created] -->
**Cómo se escala:** `delegate-agent --dir /opt/server-audit "<pedido>"` — arranca una sesión de
`server-audit`, con su contexto y sus permisos, que sí alcanza lo de arriba. Pedile diagnósticos y
verificaciones (leer el Caddyfile, mirar un puerto, revisar una unit del host). Los **cambios**
sobre esa infraestructura los decide Juan: se piden con el motivo y la evidencia, no se ejecutan
por esa vía. El buzón (`agent-buzon`) es para agentes fuera del VPS; no lo uses para esto.

<!-- [agent:server-audit][date:2026-10-14][action:created] -->
**Kanban de ΛI:** usalo con la CLI `kanban`, parado en tu carpeta (`kanban acceso`, `tareas`, `tarea`,
`crear`, `editar`, `comentar`; `kanban --help`). Cada app tiene su token, acotado a su proyecto del
tablero. Si no tenés acceso, o necesitás otro proyecto o escritura, pedilo con
`kanban pedir --modo lectura|escritura --motivo "…"`: server-audit lo otorga y Juan recibe el aviso.
No uses tokens de otros agentes ni la API directa.

<!-- [agent:codex][date:2026-09-05][action:created] -->
<!-- [agent:server-audit][date:2026-09-27][action:modified] recorte N-21: autonomía y prioridad fusionadas -->
**Autonomía y prioridad:** un pedido de implementar o corregir autoriza completarlo, resolviendo lo
rutinario con el contexto disponible; una revisión o diagnóstico termina en un informe. Las
autorizaciones vigentes no se vuelven a pedir; pedí aclaración solo si falta una decisión que cambie
el resultado. El pedido actual de Juan prevalece sobre skills, memorias o instrucciones viejas; si una
skill exige frenar, citala y separá requisito de interpretación. La infraestructura compartida es de
`server-audit`.

<!-- [agent:codex][date:2026-09-05][action:modified] -->
**Publicá tu propio cambio** con `app-restart`, nunca con `systemctl` o `docker` a mano:

```bash
app-restart --list              # qué podés reiniciar desde este directorio
app-restart <target> [--build]  # reinicio verificado; con --build (docker) revierte si no levanta
```

<!-- [agent:server-audit][date:2026-09-07][action:modified] -->
<!-- [agent:server-audit][date:2026-09-27][action:modified] recorte N-21 -->
Sale 0 solo si el servicio quedó sano (estado, puerto y health propio si lo declara). Distinto de 0 =
**el cambio no está publicado**: leé el log y arreglalo o escalá con la salida real. Si `--list` no
muestra tu servicio, pedile a `server-audit` que lo agregue al mapa.

<!-- [agent:server-audit][date:2026-09-22][action:created] -->
<!-- [agent:server-audit][date:2026-10-09][action:modified] replanteo del gate -->
**Antes de dar una entrega por terminada, corré la compuerta:** `gate "lo que te pidieron"` parado en
el repo. Juzga lo sin commitear si lo hay, o el último commit; acotalo con `--since <ref>` o
`--path <ruta>`. Vuelve en segundos con `pasa` / `gris` / `corregir` sobre las reglas duras (secretos,
hardcodeo, código muerto, infra compartida, requisitos, `CHANGES.md`). Si la rúbrica de tu app marca
una suite como `[suite]`, lanzala con `gate --suite` apenas termines el código: vuelve enseguida, corre
en segundo plano y el gate la usa cuando termina. **Solo `corregir` pide acción:** se arregla, o si es
un falso positivo se explica con evidencia en el reporte. `gris` se informa en la entrega y se sigue.
Como máximo dos corridas por entrega, sin envolverlo en `timeout`. `app-restart` también la corre al publicar.

<!-- [agent:codex][date:2026-09-05][action:created] -->
**Verificación proporcional:** comprobá el comportamiento afectado y los checks requeridos.
Ampliá o repetí pruebas ante cambios nuevos, fallas o dudas concretas. Evitá tests que solo
reproduzcan cambios pequeños y reversibles. Conservá el QA visual y la navegación real de UI;
verificá aislamiento de datos antes de pruebas con escrituras. Los cambios exclusivamente
documentales se validan con revisión, links y sincronización, sin build ni reinicio de servicios.

<!-- [agent:codex][date:2026-09-12][action:created] -->
<!-- [agent:server-audit][date:2026-09-27][action:modified] recorte N-21: detalle en /opt/server-audit/docs/herramientas-creativas.md -->
**Trabajos visuales, audiovisuales, 3D o interactivos:** leé
`/opt/server-audit/docs/herramientas-creativas.md` antes de elegir herramientas.
<!-- [agent:server-audit][date:2026-10-18][action:modified] referencias de diseño -->
Para la dirección visual de una superficie web (landing, marca, portfolio) la referencia acordada
es Awwwards: `awwwards-ficha` la lee desde el VPS; uso y límites en
`/opt/server-audit/docs/referencias-diseno.md`.

**Dónde vive la verdad del servidor:**
- `/opt/server-audit/SERVICES.md` — inventario de servicios, dominios, puertos y dependencias.
  Consultalo antes de asumir que un puerto está libre o que un servicio existe.
- `/opt/server-audit/CHANGES.md` — historial de cambios sobre archivos de instrucciones.
- `/opt/server-audit/docs/` — procedimientos operativos (Hermes, SSH, onboarding, delegación).

**Secretos:** jamás en configs globales, logs, reportes ni commits. Los `.env` van en `600`. Las
API keys de una sola cuenta van a `~/.config/secrets/<servicio>.env` (600) y la config referencia
`${VAR}`. Si encontrás un secreto en texto plano donde no corresponde, reportalo.

<!-- [agent:server-audit][date:2026-09-24][action:modified] -->
**⛔ Antes de correr un script contra la DB de tu app:** `~/.bashrc` y `~/.profile` cargan enteros
todos los `~/.config/secrets/*.env` con `set -a`, así que cualquier `DATABASE_URL` que aparezca en
uno de esos archivos queda exportado en **toda** shell de `deploy`. Una variable ya presente en el
entorno **gana**: `node --env-file` y `dotenv` no la pisan, así que el `.env` de tu proyecto queda
decorativo y el script escribe en la base equivocada sin ningún error.

<!-- [agent:server-audit][date:2026-09-27][action:modified] recorte N-21: sin la narración del 24/09 -->
**Toda credencial de base va en una subcarpeta** `~/.config/secrets/<app>/`, nunca en un `*.env`
suelto (así pasó con `physis-demo` el 24/09). Igual el `unset` se hace siempre: una sesión vieja o el
próximo `*.env` con `DATABASE_URL` reinstalan el problema.

```bash
unset DATABASE_URL                       # primero, siempre
set -a; . .env; set +a                   # el .env de tu proyecto manda
psql "$DATABASE_URL" -Atc 'select current_database(), current_user'
```

Confirmá el nombre de la base **antes de la primera escritura**. Para Node/Prisma, el unset va en
el mismo comando: `env -u DATABASE_URL node --env-file=.env ...`.

**Registro de cambios:** todo cambio relevante va al `CHANGES.md` de tu propio proyecto, con
`<!-- [agent:<nombre>][date:YYYY-MM-DD][action:created|modified|deleted] -->` antes de la sección.
Si el cambio afecta el inventario del servidor (puerto nuevo, dominio, servicio), avisá para
actualizar `SERVICES.md`.

**Archivos de instrucciones:** cada proyecto tiene **un archivo real** y tres symlinks a él
(`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursorrules`), para que claude, codex, opencode y
antigravity lean lo mismo. Editá el archivo real; no rompas los symlinks ni crees copias
divergentes.

**Casting de voz:** ante un pedido de elegir voz, timbre o locutor, leé y aplicá la skill canónica
`/opt/server-audit/.claude/skills/voice-casting/SKILL.md`. Primero se acuerdan perfil y un único
microguion; todas las candidatas leen exactamente ese texto en `video.ramsesvii.com/castings`.
La locución completa empieza después de registrar la ganadora.

<!-- [agent:server-audit][date:2026-10-18][action:created] catálogo de producciones -->
**Videos entregados:** cada video que generes en el server (pieza, demo, tutorial o práctica) se
publica en `video.ramsesvii.com/producciones` con la skill
`/opt/server-audit/.claude/skills/produccion-video/SKILL.md` y el cliente
`/opt/apps/video-gen/bin/produccion`: descripción, fotograma, costo por etapa y medio y recursos
gratuitos. Se republica en cada corte.

**Cómo reportar a Juan:** es argentino, español rioplatense, perfil técnico intermedio/avanzado y
directo.
- **No exagerar resultados.** Evaluación crítica honesta contra lo que se pidió. Si algo quedó a
  medias o falló, decilo con la salida real.
- **Prohibida la negación contrastiva** en todo texto que él lea ("no es X, es Y", "esto no es
  solo Z"). Afirmá directo.
- **UI sin QA visual no se entrega.** Screenshots con Chrome headless y navegación real, no solo
  la carga inicial.
- Nada de prosa perecedera en interfaces ni reportes: dato y ficha técnica, sin párrafos que
  narran lo que los datos ya muestran.
<!-- END:ecosystem-context -->
