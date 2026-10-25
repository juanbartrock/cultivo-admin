<!-- [agent:codex][date:2026-10-18][action:created] -->
## 2026-10-18 — Contexto compartido: versiones de modelos

`sync-agent-context` incorporó el enlace al registro `/opt/server-audit/etc/model-rollout.json`
y al procedimiento `/opt/server-audit/docs/model-rollout.md` para registrar nuevos usos de Flash
con configuración, fallback y activación. Cambio documental, validado con sync-agent-context --check.

# CHANGES.md — cultivo-admin

<!-- [agent:cultivo-admin][date:2026-10-24][action:modified] -->
## 2026-10-24 — Datos de inicio del ciclo Octubre 2026 (base de producción)

Escritura de datos con Prisma contra la base de producción, sin cambios de código ni de esquema.

- **Genéticas nuevas** (`HYBRID`, dueño `admin`): Tropicana WFC, Guaraní Porá y Pastel de Choque
  (Clon Factory, RNCyFS 11591/AFK2) y Celosa 10 (Pachamama; rótulo Diez Fernando Angel, RNCyFS
  11275/ABEFHK1). Los DataMatrix de las estampillas INASE contienen solo el número de serie
  impreso (`01CAA000520611`, `…525674`, `…528924`, `…464314`).
- **Ciclo** `Octubre 2026`, `ACTIVE`, inicio 2026-10-24: 6 esquejes que vegetan en la carpa
  Floración y después pasan a 12/12.
- **Plantas de ciclos `COMPLETED` desasociadas de su carpa** con el mismo flujo de
  `GrowService.dissociateFromSection` (evento `NOTA` con `previousSectionId`, `sectionId=null`,
  borrado de zonas). Floración: 046, 049, 062, 099. Exterior Directo: 041, 042, 061, 063–070.
  Secado: 045 (zonas previas 1:90, 2:70, 4:40, 5:30) y 048. Las 6 carpas quedaron sin plantas.
- **6 plantas nuevas** en la carpa Floración (`VEGETATIVO`, `FEM`, inicio y etapa 2026-10-24):
  049 y 067 Tropicana WFC, 043 y 061 Guaraní Porá, 045 Pastel de Choque, 068 Celosa 10.
  Los códigos se reusan de las etiquetas físicas: las plantas viejas que los tenían pasaron a
  `049-DIC25`, `043-DIC25`, `061-OCT25`, `067-OCT25`, `068-OCT25` y `045-OCT25`, cada una con un
  evento `NOTA` (`reason: tag-reuse`, `previousTagCode`).
- **Verificación:** `GET /api/sections` devuelve Floración con 6 plantas y
  `effectiveStage=VEGETATIVO`; el resto de las carpas, 0 plantas y `DEFAULT`. QA navegado en
  `/sala/carpa/<Floración>` con Playwright: las 6 tarjetas con código y genética, sin
  `console.error` ni 5xx. Hallazgo preexistente: `PlantCard` dice "Sin sección asignada" dentro
  de la carpa porque el dashboard de la carpa no incluye la relación `section`.
- **Planes del ciclo** (Prisma, dueño `admin`, Powder Feeding sobre Klasmann TS3, agua EC 0,4):
  - Alimentación `Octubre 2026 · Vegetativo indoor (Powder Feeding, TS3)` (5 semanas) y
    `Octubre 2026 · Floración con viaje (Powder Feeding, TS3)` (9 semanas: 1-5 normales, 6-7
    con dosis reducida por el viaje del 29/12, 8-9 lavado; gramos por tanque de 100 L en notas).
  - Prevención `Octubre 2026 · Preventivo vegetativo (esquejes de vivero)` (31 días) y
    `Octubre 2026 · Preventivo floración con viaje` (63 días, foliares solo hasta el día 14).
  - Los de `VEGETATIVO` asignados a las 6 plantas desde 2026-10-24, con la misma lógica que
    `assignToPlant`; los de `FLORACION` se asignan en el pase a 12/12 (el backend exige que la
    etapa del plan coincida con la de la planta).
  - Se cargaron con Prisma porque `POST /feeding-plans/import` y `/prevention-plans/import` no
    setean `userId`, y el contexto del asistente IA filtra los planes por `userId`.
  - Verificado por API (`GET /sections/:id/feeding-plans` y `/prevention-plans`: semana 1 de 5,
    día 1 de 31) y navegando la carpa: ambos planes visibles con sus 6 plantas, sin errores.
    Hallazgo preexistente: "Inicio de etapa" se muestra en formato `MM/DD/YYYY` y un día antes
    (fecha UTC a medianoche leída en `-03`).
- **Dispositivos y lecturas** (2026-10-25 00:00 UTC, por la API):
  - Sonoff THR320D `Termohigometro Indoor` pasa de Secado a Floración, con lecturas e historial.
  - Tuya `flora-extractor` (EXTRACTOR) y `flora-calidad-aire` (SENSOR, lecturas pausadas mientras
    esté offline) registrados en Floración. `vege-temp-hum` con lecturas pausadas: offline y su
    carpa quedó vacía.
  - Interruptor general `sensors_enabled=true`. Primera lectura 22,5 °C / 69,6 %, historial
    grabando, 0 líneas warn/error del backend en los ciclos siguientes. QA navegado en la home y
    la carpa sin errores.
  - Tuya devolvía 0 dispositivos ("IoT Core service subscription has expired"); volvió con los 7
    después de que Juan renovara IoT Core en la plataforma de Tuya.
  - Cámara de la carpa: el snapshot falla porque TapoCare responde 500 y el VPS no tiene ruta a
    `192.168.68.64:554`.

<!-- [agent:cultivo-admin][date:2026-09-08][action:modified] -->
<!-- [agent:server-audit][date:2026-09-16][action:created] -->
## 2026-09-16 — Checks de la compuerta en la rúbrica y commit de los informes del crítico

`docs/rubrica-critico.md` suma la sección `## Checks de la compuerta` (typecheck y lint del
frontend, tsc y jest del backend): los corre `critic-gate`, la capa 1 del crítico que
`delegate-agent --critic N` ejecuta antes de cada corrida de Fable, en el árbol actual y en el
commit base del loop. La política de checks preexistentes está en la rúbrica global de
server-audit (falla dura 3). Se commitean además la rúbrica, los informes y evidencia de
`docs/critica/` y las capturas del kill switch, que estaban solo en disco; los `runner.json`
(transcripts crudos) quedan ignorados. Cambio documental, sin build ni reinicio.

## 2026-09-08 — Ronda 2 del crítico sobre el kill switch de lecturas (rama `redisenio-2026-09`)

Correcciones sobre `docs/critica/2026-09-08-1508/informe.md` (REPROBADO 7.77, cero fallas duras).
Los siete hallazgos quedaron resueltos.

- **#1 · alta: un actuador pausado quedaba incontrolable y decía "Apagado".** El botón de
  `DeviceControlCard` estaba deshabilitado por `!isOnline` y el label salía de un `isOn` derivado
  de un status que nadie consultó. Pausar las lecturas corta la consulta al conector; el comando
  de control es otra operación. Con `readingsPaused` la tarjeta muestra "Estado desconocido" y dos
  botones explícitos, Encender y Apagar, que llaman a `control(action)` sin adivinar el estado.
  `EnvironmentPanel` ya no mostraba estado inventado: su bloque de control depende de
  `currentState !== undefined`, que con la pausa es `undefined`, así que el bloque no se dibuja.
- **#2 · media: la home decía "Todo en rango" sin una sola lectura.** `useHomeDashboard` expone
  `readingsPaused` (hay carpas con sensor y todas están pausadas) y `AlertsBlock` muestra
  "Lecturas desactivadas" con token `offline`, sin el ícono ok. El meta "actualizado hace X"
  también se calla en ese estado.
- **#3 · media: `PUT /devices/:id` aceptaba `readingsEnabled` como string.** `BooleanBodyInterceptor`
  pasó a `backend/src/common/interceptors/` como fábrica parametrizada
  (`BooleanBodyInterceptor('readingsEnabled', 'recordHistory')`) y corre en `POST /devices`,
  `PUT /devices/:id` y `PUT /readings-settings`.
- **#4 · media: un VIRTUAL con controlador pausado seguía saliendo a la red.** `getDeviceStatus`
  lee el interruptor general una vez y evalúa `isDeviceReadable` sobre el controlador antes de
  llamar al gateway. El gate del frontend hace lo mismo: `isReadingPaused` recibe un `findDevice`
  que resuelve `controlledByDeviceId` contra la lista de la pantalla, porque las secciones traen
  el id del controlador sin la fila entera.
- **#5 · media: la fila del sensor apretada a 390.** El header de `EnvironmentPanel` apila en
  móvil (nombre en su línea, badges y switches abajo con `flex-wrap`) y vuelve a una sola fila en
  `sm` con `sm:contents`. El nombre va con `truncate` y los badges con `whitespace-nowrap`.
- **#6 · baja: el GET del interruptor creaba la fila.** `get()` devuelve el default en memoria
  cuando la fila falta. La siembra queda en la migración y en `onModuleInit`. Se borró `canRead()`,
  que quedó sin usos.
- **#7 · baja: con la query de settings en vuelo se pedía status de pausados.** `useDevicesStatus`
  y `useDeviceStatus` no consultan mientras `useReadingsSettings` está en `isLoading`.

### Verificación

- typecheck frontend y backend exit 0; lint frontend con 0 errores (warnings de línea base).
- `app-restart cultivo-backend --build` y `app-restart cultivo-frontend --build` exit 0.
- `npx jest` en backend: 5 suites en verde, 18 tests. `grow.service.spec.ts` sigue con sus 2
  fallas, preexistentes y ajenas a esta tarea (confirmado en la ronda 1 corriéndolo con los
  cambios stasheados).
- **#3 por API**: `PUT /api/devices/<luz>` con `{"readingsEnabled":"false"}` → 400
  (`readingsEnabled tiene que ser booleano, llegó string`); con `{"recordHistory":"true"}` → 400;
  con `{"readingsEnabled":false}` → 200 y el valor sigue en `false` (escritura idempotente, sin
  cambiar el estado de producción).
- **#4 por test ejecutado**: `backend/src/modules/devices/readings-gate.spec.ts`, 5/5. Cubre el
  VIRTUAL con controlador pausado (responde `readingsPaused` y el gateway no se llama) y el
  VIRTUAL con controlador activo (el gateway sí se llama). No se probó contra producción porque
  exigía asignarle un controlador al humidificador virtual, que Juan pidió no tocar.
- **#1, #2, #5, #7 navegados** contra producción, 4/4: con caché frío y 40 s de espera no sale un
  solo `GET /devices/<id>/status` para `vege-temp-hum`, `Termohigometro Indoor` ni `vege-led-150`;
  el bloque de Alertas de la home no contiene "Todo en rango" y muestra "Lecturas desactivadas";
  en la carpa la tarjeta de `vege-led-150` dice "Estado desconocido", sin la palabra "Apagado",
  con Encender habilitado, y tocarlo dispara el `POST /api/devices/<id>/control` con
  `{"action":"on"}` (interceptado en el navegador para no mandarle un comando a un Tuya
  desenchufado, que dejaría un WARN en el log del panel); a 390 px los seis textos de la fila del
  sensor tienen un solo rect y terminan dentro del viewport (`Historial pausado` cierra en x=334).
- `qa:nav` 19/19 a 1440×900 y 390×844. Logs de `cultivo-backend`: 0 coincidencias de
  `/error|exception|fatal|panic/i` en las últimas 300 líneas después de los dos rebuilds y del QA.
- Producción sigue en el estado pedido: `sensorsEnabled = false`, `readingsEnabled = false` en los
  tres Tuya actuadores, los dos SENSOR en `true`, cámara Tapo y humidificador virtual sin tocar.

Capturas en `docs/rediseno-2026-09/capturas/kill-switch-lecturas-r2/`.

### Fuera de alcance

El botón flotante del asistente tapa el badge "Historial pausado" en la carpa a 390 px. La fila
mide bien (todos los elementos dentro del viewport, sin cortes); lo que se superpone es el botón,
que pertenece a las fases 2-4 del rediseño y ya se había dejado explícitamente afuera.

<!-- [agent:cultivo-admin][date:2026-09-08][action:created] -->
## 2026-09-08 — Kill switch de lecturas, general y por dispositivo (rama `redisenio-2026-09`)

El panel se llenaba con `WARN [IoTGatewayService] Error getting status for TUYA/<id>` cada 30 s
por aparatos desenchufados. El panel matchea `/error|exception|fatal|panic/i` sobre las últimas
300 líneas del contenedor, así que ese WARN contaba como error. El arreglo es dejar de consultar
al conector.

### Datos

- Migración `20260908170000_add_readings_kill_switch`, aditiva e idempotente: tabla
  `readings_settings` (fila única `singleton`, `sensors_enabled BOOLEAN DEFAULT true`, sembrada
  con `ON CONFLICT DO NOTHING`) y `devices.readings_enabled BOOLEAN NOT NULL DEFAULT true`
  (`ADD COLUMN IF NOT EXISTS`). Aplicada con `prisma migrate deploy` antes del restart; el
  contenedor arranca con `node dist/src/main` y no corre migraciones por su cuenta.
- `recordHistory` queda como estaba: decide si se persiste historial, no si se lee.

### Backend

- Módulo `readings-settings/`: `GET /readings-settings` para cualquier usuario autenticado y
  `PUT /readings-settings` con `RolesGuard` + `@Roles(ADMIN)`. `BooleanBodyInterceptor` mira el
  body crudo y rechaza `{"sensorsEnabled":"false"}` con 400, porque el `ValidationPipe` global
  corre con `enableImplicitConversion`. `onModuleInit` siembra la fila si falta, con el error
  atrapado para no tumbar el arranque.
- `DevicesService.getDeviceStatus` corta antes de salir a la red: devuelve 200 con
  `{ device, status: { online: false, readingsPaused: true } }` y no loguea. Como las
  automatizaciones pasan por ese mismo método, quedan cubiertas.
- `SensorPollerService` y `SensorHistoryService` filtran por `readingsEnabled: true` y saltan el
  ciclo entero con el interruptor general apagado, así que tampoco queda el
  `⚠️ No valid sensor data`.
- `readingsEnabled` entra en `CreateDeviceDto`/`UpdateDeviceDto`, en `create()` y en `update()`;
  el listado de devices y las secciones ya lo devuelven porque incluyen la fila completa.

### Frontend

- `features/lecturas/`: `useReadingsSettings` (react-query, invalida al togglear),
  `SensorReadingsSwitch` (general) y `DeviceReadingsSwitch` (por dispositivo), más
  `isReadingPaused()`, que replica la semántica del backend.
- `useDevicesStatus` / `useDeviceStatus` filtran los pausados antes de pedir: arman el mapa local
  con `readingsPaused: true` y no emiten un solo `GET /devices/:id/status`. Los handlers de
  socket ignoran pushes de un dispositivo pausado.
- Interruptor general en `/artefactos` (junto al `PageHeader`) y en la home (al lado de
  Actualizar). Solo ADMIN ve el switch; el resto ve el estado. Columna "Lecturas" con un switch
  por fila en `/artefactos`, y switch "Lecturas" separado del de "Historial" en `EnvironmentPanel`
  y `DeviceControlCard`. Cuando el aparato tiene sus lecturas activas y lo frena el general, el
  switch acompaña con "General off".
- `sectionReadings` distingue pausa de caída: pausado deja las métricas en `null` con
  `sensorPaused: true` y `sensorOffline: false`. Un sensor pausado queda fuera de Alertas y de
  `deviceIssues`; las carpas muestran `—` y el badge neutro "Lecturas desactivadas" (token
  `offline`).

### Estado en que quedó producción

`sensorsEnabled = false`. `readingsEnabled = false` en `vege-led-150`, `Operación Tanque Riego` y
`Switch Tanque Riego`. Los dos SENSOR (`vege-temp-hum` y `Termohigometro Indoor`) quedan en
`readingsEnabled = true`, cubiertos por el general, para que al reactivarlo vuelvan a leerse. La
cámara Tapo y el humidificador virtual quedaron sin tocar.

**Verificado.** typecheck y lint de frontend y backend en exit 0 (warnings de línea base);
`app-restart cultivo-backend --build` y `app-restart cultivo-frontend --build` en exit 0 con los
contenedores sanos. `qa:nav` 19/19 a 1440×900 y 390×844, sin errores de consola ni overflow
móvil. Navegación real: con el general encendido la home consulta `GET /devices/<sensor>/status`;
al apagarlo el `PUT /readings-settings` devuelve 200 y en 70 s no sale ni un pedido de estado de
ese sensor; lo mismo apagando `vege-led-150` por su switch. Por API: `PUT` con
`{"sensorsEnabled":"false"}` da 400, y el status de un actuador pausado da 200 con
`{"online": false, "readingsPaused": true}`. Logs de `cultivo-backend`: cero coincidencias de
`/error|exception|fatal|panic/i` desde que se apagaron los tres Tuya. Capturas en
`docs/rediseno-2026-09/capturas/kill-switch-lecturas/`.

<!-- [agent:cultivo-admin][date:2026-09-08][action:modified] -->
## 2026-09-08 — Ronda 2 del crítico sobre los rangos por etapa (rama `redisenio-2026-09`)

Correcciones sobre `docs/critica/2026-09-08-1027/informe.md` (REPROBADO 7.41, una falla dura).

- **#1 · falla dura: `/sala` coloreaba el VPD con umbrales propios y pintaba `metadata` con el
  sensor caído.** `CarpaCard` perdió su `calculateVPD` y su `getVPDColor` (0.4/0.8/1.4/1.6) y
  ahora usa `sectionReadings` + `readingStatus(metric, value, range)` con
  `rangeFor(section.effectiveStage)`, igual que la home y la carpa; el estado de los
  controlables sale de `isDeviceOn`. Con `online === false` las tres métricas van en `—` con el
  badge "Sensor sin respuesta". Para que eso fuera posible, `GET /rooms/:id/sections` —de donde
  sale `/sala`— devuelve ahora `devices`, `plants` y `effectiveStage`, lo mismo que
  `GET /sections`: antes no traía dispositivos, así que la fila de lecturas no se dibujaba nunca.
  La tarjeta también dice qué etapa aplica ("Rangos: Curado").
  `grep -rnE '(temp|hum|vpd)[A-Za-z]*\s*(<|>|<=|>=)\s*[0-9]' frontend/src` sale vacío.
- **#2 · en móvil Guardar y Cancelar quedaban fuera del viewport.** El diálogo pasa a
  `flex max-h-[85dvh] flex-col`: encabezado fijo, cuerpo con scroll propio y `DialogFooter`
  pegado abajo. A 390×844 Cancelar queda en `top 732 / bottom 768` y Guardar en `688 / 724`.
- **#3 · el error "Número inválido" se calculaba y no se mostraba.** Va debajo del input, con
  `role="alert"` y `aria-describedby`. Con texto o campo vacío el mensaje aparece y Guardar
  sigue deshabilitado.
- **#4 · documentación y cobertura.** `CLAUDE.md` nombra las tres pantallas que consumen
  `readingStatus` y el grep que verifica que no vuelvan los umbrales al frontend;
  `qa-nav.spec.ts` suma `08_admin_rangos`, así que la suite pasa de 17 a 19 casos.
- **#5 · la API aceptaba `{"tempIdealMin":"18"}`.** El `ValidationPipe` global corre con
  `enableImplicitConversion`, y un pipe de parámetro no alcanza porque corre después de la
  conversión. `NumericBodyInterceptor` (los interceptores corren antes que los pipes) mira el
  body crudo y rechaza con 400 cualquier clave del DTO que no venga como número.
- **#6 · el GET sembraba filas y cada PUT leía las 7.** La siembra de filas faltantes pasó a
  `onModuleInit` (con su error atrapado para no tumbar el arranque), `findAll` sólo lee y
  `findOne` usa `findUnique`, con 404 si la etapa no está cargada.
- **#7 · las 7 etapas con los mismos valores: sin tocar.** Es una decisión de datos de Juan
  sobre producción, no de código; la pantalla `/admin/rangos` está para eso.
- **#8 · restos de fases 2-4 y botón flotante del asistente: sin tocar.** Blur en la carpa,
  emojis en `/notificaciones` y la posición del botón del asistente pertenecen a las fases 2-4
  del rediseño, fuera del alcance de esta tarea.

**Verificado.** typecheck y lint del frontend en exit 0 (24 warnings de línea base); `npm run
build` de frontend y backend en exit 0; `qa:nav` 19/19. Navegación real 1440×900 y 390×844 con
cero errores de consola y cero escrituras: `/sala` muestra "Sensor sin respuesta · Rangos:
Curado · — — —" igual que la home, el pie del diálogo dentro del viewport, "Número inválido"
visible y Cancelar sin guardar. Con lecturas inyectadas en el navegador (sin tocar la base),
home, `/sala` y la carpa pintan los mismos colores: 24 °C / 55 % / 1.34 kPa neutro, y
29 °C `warn` con 20 % y 3.2 kPa `danger`. Por API: `GET` sin token 401, `PUT`/`PATCH` sin token
401, `PATCH {"tempIdealMin":"18"}` 400, `PUT` con strings 400, campo extra 400, min>max 400,
`GET` con admin 200. Publicado con `app-restart` (backend y frontend, exit 0). Capturas y
salidas en `docs/rediseno-2026-09/capturas/rangos-r2-20260908/`.

**Escritura declarada en producción:** una prueba mía de `PATCH /stage-ranges/DEFAULT` con
`{"tempIdealMin":"18"}` —que esperaba 400— devolvió 200 antes de agregar el interceptor y dejó
`updated_at` de la fila `DEFAULT` en 13:47:36Z. Los 16 valores quedaron idénticos (18 ya era el
valor guardado). El crítico declaró una escritura equivalente en su ronda.

<!-- [agent:cultivo-admin][date:2026-09-08][action:modified] -->
## 2026-09-08 — Hallazgo 2 del crítico: rangos de sensores por etapa en la base (rama `redisenio-2026-09`)

Decisión de Juan del 2026-09-08 sobre `docs/critica/2026-09-08-0929/informe.md`: los rangos
ok/warn/danger se configuran **por etapa**, viven en la base y se editan desde la app. Se
eliminaron las dos tablas hardcodeadas que se contradecían (`RANGES` en
`frontend/src/features/home/lib/readings.ts` y `OPTIMAL_RANGES` en
`frontend/src/components/EnvironmentPanel.tsx`).

**Base de datos.** Migración aditiva `backend/prisma/migrations/20260908130000_add_stage_ranges`:
enum `RangeStage` (`DEFAULT` + los seis valores de `PlantStage`) y tabla `stage_ranges` con una
fila por etapa y 16 columnas (rango ideal y rango amplio de temperatura, humedad, VPD y CO₂).
El seed va en la misma migración con `ON CONFLICT DO NOTHING` y `StageRangesService.findAll()`
vuelve a sembrar sólo las filas que falten (`createMany` con `skipDuplicates`): nunca pisa una
fila existente. Valores sembrados, los que tenía el frontend: temperatura 18-28 / 15-30, humedad
40-65 / 30-75, VPD 0.8-1.4 / 0.4-1.6, CO₂ 400-1500 / 300-2000, iguales para las siete filas.

La base venía de `prisma db push` y no tenía tabla `_prisma_migrations`: las dos migraciones
previas se marcaron con `prisma migrate resolve --applied` (baseline, sin ejecutar su SQL —
`add_plant_zones` incluye un `DROP COLUMN IF EXISTS "zone"` que no debía correr) y recién después
`prisma migrate deploy` aplicó la nueva. Salidas en el reporte; ningún dato existente cambió
(19 plantas, 6 carpas, 7 dispositivos y 3 ciclos antes y después).

**Backend.** Módulo `stage-ranges`: `GET /api/stage-ranges` para cualquier usuario autenticado;
`PUT` y `PATCH /api/stage-ranges/:stage` sólo `ADMIN` vía `RolesGuard`. Validación en el DTO
(números finitos) y en el servicio (min < max en ideal y amplio, y el amplio conteniendo al
ideal), con el mensaje en castellano. La API de secciones (`GET /sections`, `GET /sections/:id`
y `GET /sections/:id/dashboard`) devuelve `effectiveStage`: la etapa más frecuente entre las
plantas asignadas a la carpa, desempatando por la más avanzada, y `DEFAULT` sin plantas. La
derivación es `effective-stage.ts` y tiene test propio (`effective-stage.spec.ts`, 4 casos).

**Frontend.** `useStageRanges()` (React Query, `staleTime` 5 min) es la única fuente: la consumen
la home, la página de carpa y `/admin/rangos`. `readingStatus(metric, value, range)` devuelve
`unknown` mientras los rangos no cargaron, así que la lectura va sin color y nunca contra un
valor por defecto escrito en código. La tarjeta de carpa y el panel de ambiente muestran qué
etapa está aplicando ("Rangos: Curado"). Pantalla nueva `/admin/rangos` (ítem "Rangos" en el
menú de admin del shell y en el sheet "Más" de móvil): tabla por etapa en desktop, tarjetas en
móvil, edición en diálogo con los ocho valores por métrica y validación espejo de la del backend.

**Verificado.** `npm run typecheck` y `npm run lint` del frontend en exit 0 (24 warnings de línea
base, los mismos de antes); `npm run build` de frontend y backend en exit 0; `npx jest` del
backend con los mismos 2 fallos preexistentes de `grow.service.spec` (idénticos con el árbol
limpio) y el spec nuevo en verde; `qa:nav` 17/17. Navegación real con la credencial de admin en
1440×900 y 390×844: home con el badge de etapa por carpa (Curado, Pre-flora, Floración, Por
defecto), carpa Secado aplicando `CURADO` por desempate, `/admin/rangos` con las 7 filas, el
diálogo rechazando `min > max` y un amplio que no contiene al ideal (Guardar deshabilitado) y
**Cancelar** sin guardar; `scrollWidth` 390 y 1440 sin overflow; consola sin errores. Por API:
`GET` sin token 401, `PUT` sin token 401, `GET` con token no admin 200, `PUT`/`PATCH` con token
no admin 403, `GET` con admin 200 con las 7 filas, `PUT` con admin y `min > max` 400.

Publicado con `app-restart cultivo-backend --build` y `app-restart cultivo-frontend --build`,
ambos exit 0. Capturas en `docs/rediseno-2026-09/capturas/rangos-20260908/`.

<!-- [agent:cultivo-admin][date:2026-09-08][action:modified] -->
## 2026-09-08 — Hallazgos 1, 3, 4, 7 y 8 de la segunda pasada del crítico (rama `redisenio-2026-09`)

Correcciones sobre `docs/critica/2026-09-08-0847/informe.md`. El hallazgo 2 (rangos
hardcodeados en `readings.ts` y `EnvironmentPanel.tsx`) sigue pendiente de la decisión de
esquema de Juan; los hallazgos 5, 6, 9 y 10 quedaron fuera del alcance de esta ronda.

- **#1 · cerrar sesión disparaba 7 GET `/api/devices/:id/status` sin token.** `useDevicesStatus`
  corta antes de pedir si no hay sesión (`isAuthenticated` de `AuthContext`), aborta lo que está
  en vuelo con `AbortController` al desmontar o al reiniciar el ciclo, y `isConnected` sale de
  las dependencias del efecto de polling: pasa a una ref y sólo decide cada cuánto refrescar. El
  socket se caía al borrar el token y ese cambio de dependencia relanzaba la tanda de pedidos ya
  sin `Authorization`. `api.get` y `deviceService.getStatus` aceptan `signal`.
- **#3 · la carpa Secado mostraba 18,1 °C / 80 % en color con el sensor offline.**
  `EnvironmentPanel` aplica la misma regla que `sectionReadings`: con `status.online === false`
  las cuatro métricas van en `—` sin color de estado ni línea de rango, el ícono queda en tono
  neutro, aparece el badge "Sensor sin respuesta" y el chip de historial dice "Historial
  pausado" en vez de "Historial ON" — la grabación sigue habilitada, pero no está entrando nada.
  El estado vacío "Sin datos ambientales" ya no se traga el panel cuando el sensor está caído.
- **#4 · el buscador de `/artefactos` medía 10 px en móvil.** Buscador y filtro de tipo se
  apilan abajo de 640 px (`flex-col sm:flex-row`), el contenedor lleva `min-w-0` y en desktop
  `min-w-[200px]`.
- **#7 · `console.warn` de Supabase en cada carga.** El aviso queda sólo en desarrollo: en
  producción el login local contra `/api/auth/login` es el camino esperado.
- **#8 · `sectionReadings` caía a `sensor.metadata`.** Sin `status` no hay lectura. El metadata
  es el último valor guardado en la base, sin antigüedad ni forma de fecharlo, y se pintaba con
  color de estado.

Verificación: `npm run typecheck`, `npm run lint` (24 warnings, los mismos de la línea base) y
`npm run build` en exit 0; `npm run qa:nav` 17/17. Navegación real contra producción con sesión
de admin, evidencia en `docs/rediseno-2026-09/capturas/fix-critico-r2-20260908/`:

- `critic-logout.cjs` del propio crítico, 3 corridas: cero requests a `/api`, cero 401 y cero
  `console.error` después del click en "Cerrar sesión" (`logout-desktop-x3.txt`). Repetido desde
  el sheet "Más" en 390×844 con el mismo resultado.
- Consola completa (errores **y** warnings) en 0 para las 7 rutas más la carpa, en 390×844 y
  1440×900.
- `/sala/carpa/ba2f7493-…` con el sensor offline: Temperatura, Humedad, CO₂ y VPD en `—`, cero
  elementos de lectura con `text-blue-400`/`text-orange-400`/`text-danger`/`text-warn`.
- `/artefactos` a 390 px: el input mide 300 px, acepta texto y filtra.
- Home con `metadata` inyectada (41,5 °C) y `/status` cortado: las tarjetas muestran `—`, cero
  `text-danger`/`text-warn` y el 41,5 no aparece en ningún lado.

Publicado con `app-restart cultivo-frontend --build` (exit 0).

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


<!-- [agent:codex][date:2026-09-12][action:created] -->
## 2026-09-12 — Herramientas creativas y computer use (contexto compartido)

Por acuerdo con Juan, `server-audit` sincronizó el bloque `ecosystem-context` desde
`/opt/server-audit/ECOSYSTEM.md`: considerar herramientas especializadas y combinar
algoritmos, APIs/MCP e interfaz según la tarea, observar el resultado real y conservar
editables. Blender y Godot primero; Unreal Engine, Unity, Photoshop, DaVinci Resolve y
alternativas quedan para incorporación posterior. Verificar acceso efectivo por agente.
Contenido local y enlaces conservados; cambio documental. Registro central y validación:
`/opt/server-audit/CHANGES.md`. Backup de instrucciones:
`/opt/backups/agent-context/20260912-223420/`.

<!-- [agent:codex][date:2026-10-12][action:created] -->
## 2026-10-12 — Regla compartida de cartel Linux desktop

Sincronizado el bloque de ECOSYSTEM.md: antes de usar desktop-casa en Linux, activar el cartel de trabajo y verificarlo en el monitor físico. Mantenerlo mientras haya procesos o trabajo de otros agentes; ocultar solo al terminar. Aplica a todos los harness mediante las entradas de instrucciones del proyecto. Cambio documental, sin reinicios.
