# Informe del crítico — cultivo-admin — 2026-09-08-1508

**Veredicto: REPROBADO · 7.77 / 10 (umbral 8, piso 6)**

| | |
|---|---|
| Alcance | Feature publicada: pausar lecturas de sensores a nivel global y por dispositivo. Verificar interruptores en / y /artefactos, que con lecturas desactivadas no se consulte Tuya/Sonoff (cero Error getting status en logs), que la UI distinga pausa de sensor caído (— y Lecturas desactivadas, sin alerta), y que se pueda reactivar. El constructor deja el interruptor global apagado y los tres actuadores Tuya en readingsEnabled=false: ese es el estado esperado. Sin escrituras extra en producción. |
| Modelo | claude-fable-5-1 · uso real: claude-fable-5-1,claude-haiku-4-5-20251001 |
| Costo / turnos / duración | US$ 4.19 · 40 · 514 s |
| Rúbrica del proyecto | sí |
| Árbol modificado por el crítico | no |
| Evidencia | `/opt/apps/cultivo-admin/docs/critica/2026-09-08-1508` |

## Resumen

Evalué el kill switch de lecturas en producción: código (diff backend y frontend), typecheck/lint (exit 0), API con y sin token, logs del backend, navegación real en 1440×900 y 390×844 sobre las 8 rutas y la suite qa:nav (19/19). El núcleo funciona: con el general apagado y los tres Tuya en readingsEnabled=false el backend responde 200 con readingsPaused sin salir a la red, el poller omite el ciclo, y desde las 14:56 hay cero "Error getting status" en el log (las 300 líneas que mira el panel están limpias). La UI distingue pausa de caída con "—" y "Lecturas desactivadas", sin alertas ni ceros. REPROBADO por 7.77 sin fallas duras: lo más grave es que un actuador con lecturas pausadas queda incontrolable desde la carpa (botón deshabilitado por !isOnline) y muestra "Apagado" como estado real; además la home dice "Todo en rango" con todos los sensores pausados.

## Dimensiones

| Dimensión | Puntaje | Peso | Justificación |
|---|---:|---:|---|
| Correctitud funcional | 7.5 | 3 | API y backend cumplen (api-readings-settings.txt, api-devices-status.txt: 5 pausados con readingsPaused:true y cero WARN en backend-log-durante-status.txt; log limpio desde 14:56). Falla: vege-led-150 pausado queda sin control en la carpa (DeviceControlCard.tsx:410) y con estado "Apagado" inventado; gate no cubre VIRTUAL con controlador pausado (devices.service.ts:343-354); PUT /devices/:id sin guardia de booleano crudo. |
| UI y experiencia | 7 | 3 | Interruptores visibles en / y /artefactos en ambos viewports, badges con token offline, 18 "—" y 0 ceros en home, sin overflow (scrollWidth 390) y tab bar tocable (qa-kill-switch.json). Asperezas: Alertas dice "Todo en rango" sin ninguna lectura (home-desktop.png); "Apagado" como estado de un aparato que nadie consultó (carpa-desktop.png); fila del sensor apretada en carpa móvil (carpa-mobile.png). |
| Seguridad y datos | 8.5 | 2 | GET/PUT /readings-settings y /devices/:id/status sin token dan 401; PUT con string, campo extra y body vacío dan 400; PUT exige ADMIN por RolesGuard (controller:24-26); sin secretos en el alcance; solo 4000 y 3001 con ports en compose. Falta la misma guardia de body crudo en PUT /devices/:id para readingsEnabled (no probado en vivo porque escribe). |
| Código y arquitectura | 8 | 2 | typecheck y lint frontend exit 0, tsc backend exit 0 (frontend-typecheck.txt, frontend-lint.txt, backend-typecheck.txt). Módulo readings-settings calcado de stage-ranges, migración aditiva e idempotente, gate espejado en frontend con la misma semántica. Deuda: get() escribe en un GET (readings-settings.service.ts:48-50) y el caso VIRTUAL→controlador quedó fuera del gate en ambos lados. |
| Verificación y entrega | 9 | 1 | CHANGES.md:4-70 registra datos, backend, frontend, estado dejado en producción y verificación; app-restart backend 14:46 y frontend 14:49/14:59 con OK en /var/log/app-restart.log; capturas del constructor en docs/rediseno-2026-09/capturas/kill-switch-lecturas/; sus afirmaciones (qa:nav 19/19, 400 con string, 200 con readingsPaused, log limpio) coinciden con lo que medí. |

## Hallazgos (rankeados por impacto)

### 1. [alta] Un actuador con lecturas pausadas queda incontrolable desde la carpa y muestra "Apagado" como estado

- **Dimensión:** Correctitud funcional
- **Evidencia:** frontend/src/components/DeviceControlCard.tsx:410 (`disabled={controlling || !isOnline}`) y :430 (`isOn ? 'Encendido' : 'Apagado'`); con readingsPaused el status es {online:false, readingsPaused:true} (api-devices-status.txt, vege-led-150). Captura docs/critica/2026-09-08-1508/capturas/carpa-desktop.png: tarjeta vege-led-150 con "Lecturas off" y botón "Apagado" gris. En /artefactos la misma luz sí tiene ON/OFF (artefactos-desktop.png).
- **Acción:** Separar el corte de lecturas del control: habilitar el toggle cuando readingsPaused (el comando al conector es otra operación) y mostrar el estado como "—" o "Estado desconocido" en lugar de Apagado; que isOn no derive de un status pausado.
- **Verificación:** Con vege-led-150 en readingsEnabled=false, entrar a /sala/carpa/<vegetativo>: el botón de control habilitado, sin la palabra "Apagado", y al tocarlo sale el POST de control al backend (Playwright registrando requests).

### 2. [media] La home dice "Todo en rango" cuando ningún sensor fue leído

- **Dimensión:** UI y experiencia
- **Evidencia:** frontend/src/features/home/components/AlertsBlock.tsx:24-29 muestra "Todo en rango · actualizado hace 0 s" con alerts vacío; captura home-desktop.png y home-mobile-viewport.png con las dos carpas en "Lecturas desactivadas" y "—" en las 18 métricas.
- **Acción:** Cuando todas las carpas con sensor están en sensorPaused (o no hay lectura viva), mostrar un estado neutro ("Lecturas desactivadas" / "Sin lecturas activas") con token offline, sin el ícono ok.
- **Verificación:** Home con el general apagado: el bloque Alertas ya no contiene "Todo en rango"; con el general encendido y lecturas vivas vuelve a mostrarlo.

### 3. [media] PUT /devices/:id acepta readingsEnabled como string y la conversión implícita puede invertir el valor

- **Dimensión:** Seguridad y datos
- **Evidencia:** backend/src/modules/devices/devices.controller.ts:153 (@Put(':id') sin interceptor); backend/src/main.ts:28-31 ValidationPipe con transform; CLAUDE.md declara enableImplicitConversion, y el constructor lo cubrió sólo en readings-settings (boolean-body.interceptor.ts:10, BOOLEAN_KEYS = {sensorsEnabled}). No lo probé en vivo porque escribe en producción.
- **Acción:** Aplicar BooleanBodyInterceptor (parametrizado con readingsEnabled y recordHistory) en PUT /devices/:id, o generalizarlo a claves booleanas del DTO.
- **Verificación:** `PUT /api/devices/<id>` con `{"readingsEnabled":"false"}` devuelve 400; con `{"readingsEnabled":false}` devuelve 200.

### 4. [media] Un dispositivo VIRTUAL con controlador pausado sigue saliendo a la red por el controlador

- **Dimensión:** Correctitud funcional
- **Evidencia:** backend/src/modules/devices/devices.service.ts:343-354: canRead() mira el virtual y después llama iotGateway.getDeviceStatus(device.controlledBy...) sin chequear controlledBy.readingsEnabled; frontend/src/features/lecturas/lib/readingsGate.ts:8-11 tiene el mismo hueco. Hoy no impacta: flora-humidificador no tiene controlador (api-devices.txt), pero apenas se le asigne uno de los Tuya pausados vuelve el WARN al panel.
- **Acción:** En getDeviceStatus, si el virtual tiene controlledBy, evaluar canRead(controlledBy) y devolver readingsPaused; espejar en isReadingPaused usando device.controlledBy.
- **Verificación:** Con un virtual cuyo controlador tenga readingsEnabled=false, GET /devices/<virtual>/status responde {online:false, readingsPaused:true} y no aparece "Error getting status" en el log.

### 5. [media] En la carpa móvil la fila del sensor queda apretada al sumar el switch de Lecturas

- **Dimensión:** UI y experiencia
- **Evidencia:** Captura docs/critica/2026-09-08-1508/capturas/carpa-mobile.png: "vege-temp-hum" en tres líneas, "Lecturas desactivadas" y "Rangos: Por defecto" en dos líneas cada uno, el switch pegado al borde derecho y "Historial pausado" y el menú ⋮ empujados debajo. Sin overflow (scrollWidth 390 = innerWidth), pero la fila se lee mal. frontend/src/components/EnvironmentPanel.tsx:372-395.
- **Acción:** En < sm apilar: nombre del sensor en una línea, y debajo una fila con flex-wrap para badges y los dos switches (Lecturas / Historial). La página es de fase 2, pero el elemento nuevo lo trajo esta tarea.
- **Verificación:** Captura a 390 px: el nombre del sensor en una sola línea y cada badge sin cortar.

### 6. [baja] El GET del interruptor general crea la fila si falta

- **Dimensión:** Código y arquitectura
- **Evidencia:** backend/src/modules/readings-settings/readings-settings.service.ts:42-51: get() hace create() cuando findUnique devuelve null, aunque onModuleInit (26-39) y la migración ya la siembran.
- **Acción:** Que get() devuelva el default en memoria ({sensorsEnabled:true}) sin escribir; dejar la siembra sólo en onModuleInit y la migración.
- **Verificación:** Revisión de código: ningún create/upsert en el camino de GET /readings-settings.

### 7. [baja] Con la query de settings en vuelo el frontend asume lecturas activas y puede pedir status de sensores pausados

- **Dimensión:** Correctitud funcional
- **Evidencia:** frontend/src/features/lecturas/hooks/useReadingsSettings.ts:24 (`?? true`) y frontend/src/hooks/useDeviceStatus.ts:131 filtran con ese valor. En mi corrida no pasó (statusReqs en qa-kill-switch.json sólo trae Tapo y el virtual), y el backend igual responde pausado sin red, así que el impacto es un GET de más, no un WARN.
- **Acción:** Esperar a que la query de settings resuelva (isLoading false) antes del primer fetchAll, o pasar `enabled` a la carga inicial.
- **Verificación:** Con caché frío, Playwright no registra ningún GET /devices/<sensor>/status para los pausados.

## Evidencia reunida

**Comandos:**
- `git status --porcelain (antes y después; diff vacío: docs/critica/2026-09-08-1508/git-status-antes.txt vs git-status-despues.txt)`
- `cd frontend && npm run typecheck → exit 0 (docs/critica/2026-09-08-1508/frontend-typecheck.txt)`
- `cd frontend && npm run lint → exit 0 (docs/critica/2026-09-08-1508/frontend-lint.txt)`
- `cd backend && npx tsc --noEmit -p tsconfig.json → exit 0 (docs/critica/2026-09-08-1508/backend-typecheck.txt)`
- `docker logs --since 60m cultivo-backend | grep -ci 'error getting status' → 51, todas anteriores a 14:56:07; --since 2026-09-08T17:56:10Z → 0; --tail 300 con /error|exception|fatal|panic/i → 0 en los 5 contenedores`
- `grep -E 'cultivo-(backend|frontend)' /var/log/app-restart.log | tail → backend 14:46:08 OK, frontend 14:49:23 y 14:59:07 OK`
- `curl GET/PUT /api/readings-settings sin token → 401; GET /api/devices/<uuid>/status sin token → 401; PUT admin con "false" (string), campo extra y body vacío → 400; GET admin → sensorsEnabled:false (docs/critica/2026-09-08-1508/api-readings-settings.txt)`
- `curl GET /api/devices y GET /api/devices/<id>/status por cada uno de los 7 dispositivos → 5 con {online:false, readingsPaused:true}, Tapo online:true, virtual sin controlador; cero WARN/ERROR en el backend durante la corrida (api-devices.txt, api-devices-status.txt, backend-log-durante-status.txt)`
- `curl GET /api/sections → readingsEnabled presente en cada device (api-sections-readingsEnabled.txt)`
- `node docs/critica/2026-09-08-1508/qa-kill-switch.js → 8 rutas × 2 viewports, 0 errores de consola, 0 escrituras, scrollWidth = innerWidth, tab bar en y=788 h=56 sin nada encima (qa-kill-switch.json, qa-kill-switch.log)`
- `cd frontend && QA_LABEL=../../critica/2026-09-08-1508/qa-nav npm run qa:nav → 19 passed, exit 0 (docs/critica/2026-09-08-1508/qa-nav.txt)`
- `grep -nE '^\s*(ports:|- "?[0-9])' docker-compose.yml → sólo 127.0.0.1:4000 y 127.0.0.1:3001`
- `grep de secretos sobre readings-settings/, features/lecturas/, readingsSettingsService.ts y la migración → ninguno`

**Rutas navegadas:**
- `/login`
- `/`
- `/sala`
- `/sala/carpa/f1ed3032-cf56-4487-90a3-0d79dfd3f9b3`
- `/seguimientos`
- `/automatizaciones`
- `/artefactos`
- `/notificaciones`
- `/admin/usuarios`
- `/admin/rangos (vía qa:nav)`

**Capturas:**
- `docs/critica/2026-09-08-1508/capturas/home-desktop.png`
- `docs/critica/2026-09-08-1508/capturas/home-mobile.png`
- `docs/critica/2026-09-08-1508/capturas/home-mobile-viewport.png`
- `docs/critica/2026-09-08-1508/capturas/artefactos-desktop.png`
- `docs/critica/2026-09-08-1508/capturas/artefactos-mobile.png`
- `docs/critica/2026-09-08-1508/capturas/artefactos-mobile-viewport.png`
- `docs/critica/2026-09-08-1508/capturas/carpa-desktop.png`
- `docs/critica/2026-09-08-1508/capturas/carpa-mobile.png`
- `docs/critica/2026-09-08-1508/capturas/sala-desktop.png`
- `docs/critica/2026-09-08-1508/capturas/sala-mobile.png`
- `docs/critica/2026-09-08-1508/capturas/seguimientos-desktop.png`
- `docs/critica/2026-09-08-1508/capturas/seguimientos-mobile.png`
- `docs/critica/2026-09-08-1508/capturas/automatizaciones-desktop.png`
- `docs/critica/2026-09-08-1508/capturas/automatizaciones-mobile.png`
- `docs/critica/2026-09-08-1508/capturas/notificaciones-desktop.png`
- `docs/critica/2026-09-08-1508/capturas/notificaciones-mobile.png`
- `docs/critica/2026-09-08-1508/capturas/admin-usuarios-desktop.png`
- `docs/critica/2026-09-08-1508/capturas/admin-usuarios-mobile.png`
- `docs/critica/2026-09-08-1508/qa-nav/ (19 capturas de la suite del proyecto)`

## No evaluado

- Reactivación en vivo (mover el interruptor general o el de un aparato y ver volver las lecturas): exige PUT en producción. Verifiqué el contrato por API (PUT valida, GET refleja) y que los switches están habilitados para admin en el DOM (aria-checked, disabled=false), pero no los toqué.
- PUT /devices/:id con readingsEnabled como string (hallazgo 3): probarlo escribe en producción; queda por evidencia de código.
- PUT /readings-settings con un usuario sin rol ADMIN (esperado 403): no hay credencial no-admin disponible.
- Comportamiento con un dispositivo Sonoff actuador pausado: el único Sonoff es un SENSOR cubierto por el general; no hay actuador Sonoff en producción.
- Descarte de pushes de socket para dispositivos pausados: con el poller detenido no hay pushes que observar.
