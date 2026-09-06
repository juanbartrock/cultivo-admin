# Reporte de la fase 0 — saneamiento

<!-- [agent:cultivo-admin][date:2026-09-05][action:created] -->

Delegación: Opus 5, effort high, 1.826 s, 122 turnos, US$ 10,56. Exit 0.

Fase 0 terminada y publicada. Reporte:

## Rama y commits (`redisenio-2026-09`, sin push)

| Commit | Qué |
|---|---|
| `5447e13` | sync de cambios previos sin commitear (contexto de ecosistema + diagnóstico) |
| `604263d` | login: fuera el botón "Entrar como Administrador", el separador y el texto con las credenciales |
| `e49544e` | socket.io por `/api/socket.io` (gateway + cliente) |
| `24aa2cb` | encoding: mojibake y BOM |
| `464de12` | CLAUDE.md con el stack real + CHANGES.md |
| `de82d39` | QA de navegación (config, spec, script `qa:nav`) |
| `10ca946` | QA: sesión reutilizable, medición de overflow real, capturas |
| `209b1d3` | `test:e2e` deja de recoger el spec de QA |

## Salidas reales

- `app-restart cultivo-backend --build` → **EXIT=0** · `[app-restart] cultivo-backend running · puerto 4000 escuchando`
- `app-restart cultivo-frontend --build` → **EXIT=0** · `[app-restart] cultivo-frontend running · puerto 3001 escuchando` (dos veces: la segunda con el ajuste del socket)
- `npm run typecheck` sin errores · `npm run lint` exit 0 (sólo warnings preexistentes) · `npm run test:e2e` (smoke) 3/3
- `QA_LABEL=fase0 npm run qa:nav` → **EXIT=0**: `15 passed, 2 skipped (40.4s)`. Los 2 skipped son los `test.fixme` de móvil (Ciclos y Admin de usuarios). Capturas en `docs/rediseno-2026-09/capturas/fase0/` (17 PNG).
- Handshake verificado a mano: `GET /api/socket.io/?EIO=4&transport=polling` → 200 con `sid`; upgrade a `wss://` responde `101 Switching Protocols`. En `/sala` la consola muestra `Socket connected: kd8EAnBBUGDgr3k3AAEC` y ningún `Socket connection error`.
- Login sin sesión: botones = `["", "Iniciar sesión", ""]` (los vacíos son el ojo de la contraseña y la burbuja del asistente); texto sin "acceso rápido" ni "Usuario: admin".

## Dos cosas que cambié y no estaban en el pedido

1. **El campo de login pasó de `type="email"` a `type="text"` ("Email o usuario")**. El backend autentica por `username` y tu usuario admin no es un email: sacado el botón, la validación del navegador bloqueaba el envío y te quedabas afuera de tu propia app. Con el cambio el formulario entra igual con usuario o con email.
2. **`SocketContext` depende del token, no del estado de auth**, y sólo abre el socket con sesión. Antes leía `auth_token` de `localStorage`, clave que nadie escribe (el login guarda `access_token`), así que el handshake iba sin token y el gateway lo rechaza en producción (`REALTIME_ALLOW_GUEST=false`). Con la primera versión del fix se abría y cerraba una conexión por carga (warning `WebSocket is closed before the connection is established`); ahora abre una sola.

## Detalles del QA que conviene saber

- El check de overflow que pedías (`scrollWidth > window.innerWidth`) **nunca dispara** con emulación móvil: Chrome ajusta `innerWidth` al contenido, así que en Ciclos daba `469 === 469`. Lo comparo contra el viewport configurado (390). Medido: `/` 390 · `/sala` 390 · `/seguimientos` **469** · `/automatizaciones` 390 · `/artefactos` 390 · `/notificaciones` 390 · `/admin/usuarios` **511**. Los dos desbordes quedaron en `test.fixme` con motivo y fase; el resto pasa de verdad.
- El login quedó en un proyecto `setup` que guarda el estado de sesión (`frontend/test-results/.auth/`, ignorado por git). Motivo: navegar apenas cambia la URL abortaba el `fetch` de `/auth/me` en vuelo y eso ensuciaba cada ruta con `TypeError: Failed to fetch`. El formulario se sigue ejercitando en ese setup, y si se rompe falla toda la corrida.
- Encoding: eran más de 18. Corregí 158 secuencias mojibake en 10 archivos (front y back), 35 acentos perdidos como `?` en `AuthContext.tsx` y `plans.tools.ts`, y saqué el BOM de 34 archivos. Verificado con re-escaneo: cero ocurrencias.

## Para la fase 1

- `featureFlags.ts` tiene 4 flags con default `true` y se usan en 4 archivos (`layout.tsx`, `sala/page.tsx`, `sala/carpa/[id]/page.tsx`, `automatizaciones/page.tsx`). `styles/tokens.css` ya define la paleta semántica que querés (superficie, borde, texto, acento) con 9 `!important` para tapar colores viejos: esos tokens se pueden mover casi tal cual a `tailwind.config.ts` y borrar el archivo.
- El `Header` se monta en 4 layouts de ruta (`sala`, `seguimientos`, `automatizaciones`, `artefactos`); `notificaciones` y `admin/usuarios` no lo montan. Un shell en el layout raíz elimina los cuatro de una.
- Monolitos a partir: `CarpaDetailPage` 2815 líneas, `AutomatizacionesPage` 2191, `SeguimientosPage` 2164, `PlantCard` 1140, `artefactos/page.tsx` 1051.
- Sigue vivo lo que no toca esta fase: Tuya y Sonoff devuelven **500** cada 30 s en el log del backend (`Error getting status for TUYA/eb3f... 500`), el badge de notificaciones en "9+", y `/api/auth/login` acepta credenciales por POST desde afuera sin rate limit visible.
- shadcn/ui no está instalado: hoy hay `select` y `checkbox` nativos. Instalarlo implica sumar Radix como dependencia nueva del frontend.
