# Informe del crítico — cultivo-admin — 2026-09-08-0847

**Veredicto: REPROBADO · 7.09 / 10 (umbral 8, piso 6)**

| | |
|---|---|
| Alcance | El rediseño F0+F1 publicado en producción (https://cultivo.ramsesvii.com, rama redisenio-2026-09) y el estado general de la app como la ve un administrador. El hallazgo 2 del informe del 2026-09-08-0745 (rangos de sensores hardcodeados) quedó explícitamente fuera del alcance de esta tarea por decisión de Juan: marcalo como falla dura si sigue igual, pero no penalices al constructor por no haberlo tocado. |
| Modelo | claude-fable-5-1 · uso real: claude-fable-5-1,claude-haiku-4-5-20251001 |
| Costo / turnos / duración | US$ 5.22 · 39 · 746 s |
| Rúbrica del proyecto | sí |
| Árbol modificado por el crítico | no |
| Evidencia | `/opt/apps/cultivo-admin/docs/critica/2026-09-08-0847` |

## Resumen

Evalué F0+F1 en producción tras las correcciones del 2026-09-08: typecheck, lint y build en exit 0; qa:nav 17/17; recorrido propio de 8 rutas en 390×844 y 1440×900 con scrollWidth igual al viewport, tab bar alcanzable, tap en "Más" sin force, un solo h1, carpa con flecha atrás a los 300 ms y tarjetas de Vegetativo/Secado en "—" con badge "Sensor sin respuesta". Los seis hallazgos que el constructor dice haber corregido están corregidos y publicados. Reprobado por dos fallas duras: (1) "Cerrar sesión", desde el menú de usuario y desde el sheet Más, dispara 7 GET /api/devices/:id/status sin Authorization y deja 7 console.error 401 (reproducido 3 de 3); (2) los rangos ok/warn/danger siguen hardcodeados, ahora en dos tablas distintas (readings.ts 18-28 y EnvironmentPanel.tsx 20-28), fuera del alcance del constructor por decisión de Juan. Lo más grave a nivel producto: la carpa Secado muestra 18.1 °C / 80 % en color y "Historial ON" con el sensor offline mientras la home dice "Sensor sin respuesta"; y el buscador de /artefactos mide 10 px en móvil.

## Fallas duras

- **Global #2: error de consola del navegador durante un flujo principal** — docs/critica/2026-09-08-0847/critic-logout.txt: 155 ms después del click en "Cerrar sesión" salen 7 GET /api/devices/<id>/status con auth=false y vuelven 7×401 con 7 console.error "Failed to load resource". Reproducido también en critic-nav2.json (desktop desde el menú de usuario y móvil desde el sheet Más). Causa: useDeviceStatus.ts:210 relanza fetchAllStatuses cuando isConnected cambia (el socket se desconecta al borrar el token en AuthContext.tsx:236-247).
- **Global #4 / mínimo del proyecto: rangos de estado de sensores salen de configuración de carpa o ciclo, nunca de constantes del frontend (fuera del alcance del constructor por decisión de Juan; se marca sin penalizarlo)** — frontend/src/features/home/lib/readings.ts:17-21 (RANGES temp 18-28/15-30, hum 40-65/30-75, VPD 0.8-1.4/0.4-1.6) y frontend/src/components/EnvironmentPanel.tsx:55-60 (OPTIMAL_RANGES temp 20-28, hum 40-70, VPD 0.8-1.2): dos tablas distintas para la misma lectura. critic-nav2.json muestra "Óptimo: 20-28 °C" en la carpa Secado.

## Dimensiones

| Dimensión | Puntaje | Peso | Justificación |
|---|---:|---:|---|
| Correctitud funcional | 7 | 3 | critic-nav.json: 7 rutas + carpa sin console.error/pageerror/HTTP≥400 en ambos viewports; selector de sala cambia a ?sala=<id>; sidebar colapsa a 64 px y persiste tras reload; Más navega con tap desde /, /seguimientos y /admin/usuarios; carpa con flecha y título "Carpa" a 300 ms. Baja por critic-logout.txt (7×401 y 7 console.error al cerrar sesión), carpa Secado con lectura stale en color con sensor offline (critic-nav2.json) y buscador de /artefactos de 10 px en móvil. |
| UI y experiencia | 7 | 3 | Shell y home cumplen el brief: plano, sin degradés ni blur en las 7 rutas (scan de computed styles), tabular-nums, guiones sin dato, scrollWidth 390 en todas, tab bar dentro del viewport con hit-test correcto. Ancla 7 por restos del diseño anterior: carpa con backdrop-blur, ilustración y chips naranja; /seguimientos con chips azules y texto "panel izquierdo" en móvil; /notificaciones con checkbox nativos, 20 emojis y borde naranja; /artefactos con buscador inutilizable; espaciado de palabras apretado con Manrope a 12–14 px ("actualizadohace0 s", "Sala deCultivo"). |
| Seguridad y datos | 6.5 | 2 | api-sin-token.txt: 8 endpoints devuelven 401; con token responden; /users exige ADMIN; .env en 600; compose sin ports: en IoT; sin credenciales de acceso en el repo; token borrado al salir. Baja por los rangos hardcodeados en readings.ts:17-21 y EnvironmentPanel.tsx:55-60 (mínimo del proyecto, fuera del alcance del constructor), las 7 requests sin token al cerrar sesión y el appId/appSecret de eWeLink en sonoff-service/src/ewelink.js:18-19 (clave pública del fork, preexistente). |
| Código y arquitectura | 7.5 | 2 | typecheck.txt, lint.txt (24 warnings preexistentes) y build.txt en exit 0; código muerto de la home vieja borrado; un solo h1 por ruta; PageHeader en estados de carga/error/vacío. Deuda: useDeviceStatus.ts:210 refetch por isConnected sin chequear sesión (causa del 401 en logout); dos tablas de rangos que se contradicen; readings.ts:126-133 cae a sensor.metadata (valor de DB) con color de estado; console.warn de Supabase en cada carga (supabase.ts:14). |
| Verificación y entrega | 8 | 1 | qa-nav.txt reproduce 17 passed; /var/log/app-restart.log 08:41:13 OK e imagen del contenedor creada 08:41:04, posterior al último commit de código (ef44369 08:38); CHANGES.md registra las correcciones y todo lo contrastable del reporte se cumple. Falta: el flujo de cerrar sesión no se probó y ahí vive la falla dura; la afirmación "Todo en rango · actualizado hace 0 s" con respuesta forzada queda sin verificar. |

## Hallazgos (rankeados por impacto)

### 1. [bloqueante] Cerrar sesión dispara 7 pedidos de estado sin token y deja 7 console.error 401

- **Dimensión:** Correctitud funcional
- **Evidencia:** docs/critica/2026-09-08-0847/critic-logout.txt (t=587 click, t=742-755 siete GET /api/devices/:id/status auth=false, t=795-841 siete 401 + console.error); critic-nav2.json desktop.errors y movil.errors; frontend/src/hooks/useDeviceStatus.ts:196 y :210 (deps con isConnected); frontend/src/contexts/AuthContext.tsx:236-247
- **Acción:** Que fetchAllStatuses salga temprano sin sesión (leer isAuthenticated de useAuth o el token) y que el cleanup del efecto aborte los pedidos en vuelo con AbortController; sacar isConnected de las deps del efecto de polling (recalcular solo el intervalo). Alternativa complementaria: en signOut navegar a /login antes de borrar el token.
- **Verificación:** NODE_PATH=frontend/node_modules node docs/critica/2026-09-08-0847/critic-logout.cjs: cero requests a /api sin Authorization después del click y cero console.error; repetir desde el sheet Más en 390 px.

### 2. [bloqueante] Rangos ok/warn/danger hardcodeados, ahora en dos tablas que se contradicen (fuera del alcance del constructor)

- **Dimensión:** Seguridad y datos
- **Evidencia:** frontend/src/features/home/lib/readings.ts:17-21 y frontend/src/components/EnvironmentPanel.tsx:55-60; critic-nav2.json desktop.secado.text: "Óptimo: 20-28 °C" mientras la home usa 18-28. Schema Prisma sin campos de rango.
- **Acción:** Pendiente de la decisión de esquema de Juan: rangos por carpa (override por ciclo) con CRUD en el backend, expuestos en GET /sections; el frontend lee de ahí y sin rangos el estado es unknown. Mientras tanto, una sola tabla compartida entre home y carpa para dejar de contar dos historias.
- **Verificación:** grep -rn 'RANGES\|OPTIMAL_RANGES' frontend/src vacío; cambiar un rango desde la UI cambia el color en home y carpa sin rebuild.

### 3. [alta] La carpa Secado muestra 18.1 °C / 80 % / 0.41 kPa en color y "Historial ON" con el sensor offline

- **Dimensión:** Correctitud funcional
- **Evidencia:** docs/critica/2026-09-08-0847/api-device-status.txt: status {online:false, temperature:18.1, humidity:80.2}; critic-nav2.json desktop.secado.readings: "18.1°C [text-blue-400]", "80% [text-orange-400]"; capturas/carpa-secado-movil.png y carpa-secado-desktop.png; la home en capturas/home-desktop.png dice "Sensor sin respuesta" para la misma carpa. frontend/src/components/EnvironmentPanel.tsx:206 calcula isOnline pero las tarjetas de lectura (líneas 120-150) no lo usan.
- **Acción:** Aplicar en EnvironmentPanel la misma regla que sectionReadings: con status.online === false, guion en las tres lecturas, sin color de estado, badge "Sensor sin respuesta" y sin "ON". Pertenece al rediseño de carpa (fase 2), pero la contradicción entre home y carpa se corrige hoy.
- **Verificación:** En /sala/carpa/ba2f7493-8f0b-45f1-99b6-5427d014de75 con el sensor offline: ningún elemento de lectura con text-blue-400/text-orange-400/text-danger/text-warn y las tres métricas en "—".

### 4. [alta] El buscador de /artefactos mide 10 px en móvil y es inutilizable

- **Dimensión:** UI y experiencia
- **Evidencia:** docs/critica/2026-09-08-0847/critic-nav2.json movil.artefactosSearch: {ph:"Buscar dispositivo...", w:10}; capturas/artefactos-movil-viewport.png (input reducido a "Bı"); frontend/src/app/artefactos/page.tsx:515-519 (flex-1 sin min-w-0 junto al select de tipos).
- **Acción:** Debajo de sm apilar buscador y filtro en columna con w-full; en desktop min-w-[200px] en el buscador. Es fase 4, pero un control roto en una ruta principal se corrige antes.
- **Verificación:** A 390 px el input de búsqueda mide ≥ 200 px y se puede escribir y filtrar.

### 5. [media] Restos del diseño anterior en carpa, /seguimientos, /notificaciones y /admin/usuarios (fases 2-4)

- **Dimensión:** UI y experiencia
- **Evidencia:** critic-nav.json routes.carpa.dom.blur=['div.relative.overflow-hidden.bg-zinc-800/50'] en ambos viewports; capturas/carpa-secado-movil.png (ilustración naranja, chips de color decorativo); capturas/seguimientos-movil-viewport.png (chips azules "Completado", texto "Selecciona un ciclo del panel izquierdo" en móvil sin panel izquierdo); capturas/notificaciones-movil-viewport.png (checkbox nativos, 20 emojis según dom.emojis, borde naranja); capturas/admin-usuarios-movil-viewport.png (paleta zinc y chips dorados PREMIUM).
- **Acción:** Programar en las fases 2-4: carpa plana con tokens y sin blur; Checkbox de shadcn y títulos sin emoji en notificaciones; estado vacío de ciclos sin instrucciones de layout; usuarios con tokens.
- **Verificación:** DOM_SCAN de critic-nav.cjs con blur=[] en carpa, nativeCheckbox=0 y emojis=0 en /notificaciones; sin clases bg-zinc-*/text-blue-*/text-orange-* en esas pantallas.

### 6. [media] Espacios entre palabras casi invisibles con Manrope a 12–14 px

- **Dimensión:** UI y experiencia
- **Evidencia:** capturas/home-movil-viewport.png y home-desktop.png: "actualizadohace0 s", "Sala deCultivo"; capturas/admin-usuarios-movil-viewport.png: "Nuevousuario"; capturas/seguimientos-movil-viewport.png: "Nuevociclo". critic-fonts.txt: fuente cargada (__Manrope loaded), espacio de 2 px contra 8 px de la "n" a 12 px; el DOM sí tiene los espacios (spanText "actualizado hace 0 s").
- **Acción:** Agregar word-spacing (≈0.06em) a los tamaños text-xs/text-sm en globals.css o cambiar la fuente de cuerpo por una con espacio estándar; revisar en capturas reales.
- **Verificación:** Captura de la home a 390 y 1440 px donde "actualizado hace N s" y "Sala de Cultivo" se leen con espacios.

### 7. [baja] console.warn de Supabase en cada carga de página

- **Dimensión:** Código y arquitectura
- **Evidencia:** critic-nav.json: todas las rutas registran "warning: Supabase credentials not configured…"; frontend/src/lib/supabase.ts:14.
- **Acción:** Emitir el aviso una sola vez y solo en desarrollo, o silenciarlo cuando el login local está configurado.
- **Verificación:** critic-nav.cjs con errors=[] en las 8 rutas incluyendo warnings.

### 8. [baja] sectionReadings sigue cayendo al metadata del sensor en la base cuando no hay status

- **Dimensión:** Código y arquitectura
- **Evidencia:** frontend/src/features/home/lib/readings.ts:126-133: sin status usa sensor.metadata.temperature/humidity y la tarjeta lo pinta con color de estado. Hoy metadata es null en los 7 dispositivos (api-sections.json), por eso no se ve.
- **Acción:** Quitar el fallback a metadata o renderizarlo como stale (gris, con antigüedad) sin color de estado.
- **Verificación:** Con un sensor cuyo metadata tenga temperature y sin status, la tarjeta muestra "—" o el valor en text-fg-faint sin text-warn/text-danger.

### 9. [baja] appId y appSecret de eWeLink en texto plano en el microservicio Sonoff

- **Dimensión:** Seguridad y datos
- **Evidencia:** sonoff-service/src/ewelink.js:18-19 (clave de app pública del fork baugp/ewelink-api, en el repo desde 7c19065 del 2025-12-07); sonoff-service/.env.example no la contempla.
- **Acción:** Leerlos de EWELINK_APP_ID/EWELINK_APP_SECRET con el valor actual como default documentado en .env.example.
- **Verificación:** grep -n appSecret sonoff-service/src/ewelink.js solo muestra lectura de process.env.

### 10. [baja] Conocidos fuera del alcance que siguen vivos

- **Dimensión:** Correctitud funcional
- **Evidencia:** docs/critica/2026-09-08-0847/backend-logs.txt: 316 WARN "Error getting status for TUYA/…" en 45 min; capturas/notificaciones-movil-viewport.png con alertas de tormenta con emoji.
- **Acción:** Credenciales Tuya/Sonoff y notificaciones de clima como tareas aparte del rediseño; sin penalización acá.
- **Verificación:** Log del backend sin WARN de IoT durante 15 min.

## Evidencia reunida

**Comandos:**
- `cd frontend && npm run typecheck → docs/critica/2026-09-08-0847/typecheck.txt (exit 0)`
- `cd frontend && npm run lint → lint.txt (exit 0, 24 warnings preexistentes)`
- `cd frontend && npm run build → build.txt (exit 0)`
- `set -a; . ~/.config/secrets/cultivo-admin-login.env; set +a; QA_LABEL=../../critica/2026-09-08-0847/qa-nav npm run qa:nav → qa-nav.txt (17 passed)`
- `NODE_PATH=frontend/node_modules node docs/critica/2026-09-08-0847/critic-nav.cjs → critic-nav.txt / critic-nav.json (8 rutas × 2 viewports: consola incl. warnings, HTTP≥400, scrollWidth, tab bar con hit-test, gradientes/blur, h1/role=heading, selector de sala, tarjetas de la home, tap en Más desde /, /seguimientos y /admin/usuarios, tap en cada pestaña, header de carpa a 300/1000/2500 ms)`
- `NODE_PATH=frontend/node_modules node docs/critica/2026-09-08-0847/critic-nav2.cjs → critic-nav2.txt / critic-nav2.json (sidebar colapsar + reload, menú de usuario, carpa Secado, automatizaciones a 10 s, buscador de artefactos, logout desde menú y desde sheet Más)`
- `NODE_PATH=frontend/node_modules node docs/critica/2026-09-08-0847/critic-logout.cjs → critic-logout.txt (timeline de requests y consola alrededor de Cerrar sesión)`
- `NODE_PATH=frontend/node_modules node docs/critica/2026-09-08-0847/critic-fonts.cjs → critic-fonts.txt (fuentes cargadas y ancho del espacio)`
- `curl sin token a /api/sections, /api/cycles, /api/events, /api/notifications/unread-count, /api/rooms, /api/users, /api/auth/me, /api/devices → api-sin-token.txt (8×401)`
- `POST /api/auth/login + GET con token → api-con-token.txt, api-sections.json, api-device-status.txt`
- `docker logs cultivo-backend --since 45m → backend-logs.txt (0 ERROR, 316 WARN Tuya); docker logs cultivo-frontend (solo arranque)`
- `docker compose ps + grep -n ports: docker-compose.yml (solo 127.0.0.1:4000 y 127.0.0.1:3001)`
- `docker inspect cultivo-frontend (imagen creada 2026-09-08 08:41:04, posterior a ef44369) + grep cultivo /var/log/app-restart.log (08:32 y 08:41 OK)`
- `grep de secretos (password/api key/secret/token) en el repo sin node_modules; grep -rl 'bg-gradient|backdrop-blur' frontend/src (19 archivos, ninguno del shell ni de la home)`
- `git status --porcelain antes y después (idéntico: solo docs/critica/ y docs/rubrica-critico.md sin trackear, previos al informe)`

**Rutas navegadas:**
- `/login (formulario real, móvil y desktop)`
- `/`
- `/sala`
- `/sala?sala=16fab41e-a1fd-4cc0-be2d-1858e0720133 (cambio de sala por el Select)`
- `/sala/carpa/f1ed3032-cf56-4487-90a3-0d79dfd3f9b3 (primera carpa, muestreo del header a 300/1000/2500 ms)`
- `/sala/carpa/ba2f7493-8f0b-45f1-99b6-5427d014de75 (Secado, sensor offline)`
- `/seguimientos (y tap real en cada pestaña de la tab bar desde acá)`
- `/automatizaciones (también a 10 s)`
- `/artefactos (también llegando desde el sheet Más en móvil desde /, /seguimientos y /admin/usuarios)`
- `/notificaciones`
- `/admin/usuarios`
- `Cerrar sesión desde el menú de usuario (desktop) y desde el sheet Más (móvil) → /login`

**Capturas:**
- `docs/critica/2026-09-08-0847/capturas/home-movil.png`
- `docs/critica/2026-09-08-0847/capturas/home-movil-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/home-movil-3s.png`
- `docs/critica/2026-09-08-0847/capturas/home-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/home-desktop-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/home-desktop-3s.png`
- `docs/critica/2026-09-08-0847/capturas/home-desktop-sidebar-colapsada.png`
- `docs/critica/2026-09-08-0847/capturas/home-desktop-menu-usuario.png`
- `docs/critica/2026-09-08-0847/capturas/sala-movil.png`
- `docs/critica/2026-09-08-0847/capturas/sala-movil-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/sala-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/sala-desktop-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/sala-selector-abierto-movil.png`
- `docs/critica/2026-09-08-0847/capturas/sala-selector-abierto-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/sala-cambiada-movil.png`
- `docs/critica/2026-09-08-0847/capturas/sala-cambiada-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/carpa-movil.png`
- `docs/critica/2026-09-08-0847/capturas/carpa-movil-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/carpa-movil-300ms.png`
- `docs/critica/2026-09-08-0847/capturas/carpa-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/carpa-desktop-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/carpa-desktop-300ms.png`
- `docs/critica/2026-09-08-0847/capturas/carpa-secado-movil.png`
- `docs/critica/2026-09-08-0847/capturas/carpa-secado-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/seguimientos-movil.png`
- `docs/critica/2026-09-08-0847/capturas/seguimientos-movil-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/seguimientos-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/seguimientos-desktop-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/automatizaciones-movil.png`
- `docs/critica/2026-09-08-0847/capturas/automatizaciones-movil-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/automatizaciones-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/automatizaciones-desktop-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/automatizaciones-desktop-10s.png`
- `docs/critica/2026-09-08-0847/capturas/artefactos-movil.png`
- `docs/critica/2026-09-08-0847/capturas/artefactos-movil-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/artefactos-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/artefactos-desktop-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/notificaciones-movil.png`
- `docs/critica/2026-09-08-0847/capturas/notificaciones-movil-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/notificaciones-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/notificaciones-desktop-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/admin-usuarios-movil.png`
- `docs/critica/2026-09-08-0847/capturas/admin-usuarios-movil-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/admin-usuarios-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/admin-usuarios-desktop-viewport.png`
- `docs/critica/2026-09-08-0847/capturas/mas-sheet-desde-home-movil.png`
- `docs/critica/2026-09-08-0847/capturas/mas-sheet-desde-seguimientos-movil.png`
- `docs/critica/2026-09-08-0847/capturas/mas-sheet-desde-admin-usuarios-movil.png`
- `docs/critica/2026-09-08-0847/capturas/login-movil.png`
- `docs/critica/2026-09-08-0847/capturas/login-desktop.png`
- `docs/critica/2026-09-08-0847/capturas/logout-movil.png`
- `docs/critica/2026-09-08-0847/capturas/logout-desktop.png`
- `docs/critica/2026-09-08-0847/qa-nav/ (17 PNG de la suite qa:nav del proyecto)`

## No evaluado

- "Todo en rango · actualizado hace N s": en producción hay dos alertas de sensor offline, así que el bloque muestra alertas y la antigüedad va en el encabezado de la sección ("actualizado hace 0 s", verificado); la variante sin alertas exige mockear /api/sections y no se reprodujo.
- Colores warn/danger con lecturas reales en rango en la home: los dos sensores de producción están offline (Tuya y Sonoff fallan); solo se verificó el camino offline (guiones sin color).
- Refresco del contador de no leídas por el evento alert del socket: unread-count 0 durante la sesión y no se generan datos en producción.
- Aislamiento de datos entre usuarios: sin credencial de un usuario no admin; solo se comprobó por código que /users exige rol ADMIN.
- Flujos con escritura (crear/editar/eliminar sala, carpa, ciclo, usuario; marcar notificaciones; toggles de dispositivos): prohibidos por la regla de no escribir en producción.
- Fallback a sensor.metadata en readings.ts: los 7 dispositivos tienen metadata null, así que el camino no es observable en producción.
