# Informe del crítico — cultivo-admin — 2026-09-08-1413

**Veredicto: APROBADO · 8.27 / 10 (umbral 8, piso 6)**

| | |
|---|---|
| Alcance | El rediseño F0+F1 publicado en producción (https://cultivo.ramsesvii.com, rama redisenio-2026-09) y el estado general de la app como la ve un administrador, con foco en la feature nueva: rangos de estado de sensores por etapa en la base con CRUD y pantalla /admin/rangos. Informe anterior: docs/critica/2026-09-08-1029/informe.md (ronda 1); el constructor corrigió sus hallazgos 1 a 6 en el commit 1958eba. Verificá hallazgo por hallazgo y reevaluá todo. Que las 7 etapas tengan los mismos valores es decisión de Juan (los ajusta desde la pantalla): no lo penalices. Sin escrituras en producción. |
| Modelo | claude-fable-5-1 · uso real: claude-fable-5-1,claude-haiku-4-5-20251001 |
| Costo / turnos / duración | US$ 7.08 · 5 · 756 s |
| Rúbrica del proyecto | sí |
| Árbol modificado por el crítico | no |
| Evidencia | `/opt/apps/cultivo-admin/docs/critica/2026-09-08-1413` |

## Resumen

Reevalué F0+F1 en producción tras 1958eba con foco en los rangos por etapa. Los 6 hallazgos corregidos se verificaron uno por uno: /sala usa sectionReadings + readingStatus con rangeFor(effectiveStage) y muestra 'Sensor sin respuesta · Rangos: Curado · — — —' igual que la home; con lecturas inyectadas en el navegador (24/55, 29/20, 30/30) home, /sala y carpa pintan el mismo tono en móvil y desktop, y con GET /stage-ranges en 500 las tres pantallas quedan sin color (text-fg-faint). Diálogo móvil con Guardar/Cancelar dentro del viewport apenas abre (top 688/732 < 844) y con hit-test ok; 'Número inválido' visible; PATCH con "18" string → 400 del interceptor; GET sólo lee; qa:nav 19/19; typecheck, lint, tsc y jest en exit 0; grep de umbrales vacío; árbol git idéntico antes y después. Aprobado 8.27. Lo más flojo: el logger HTTP registra statusCode 200 en toda respuesta rechazada (los 400 del constructor y los míos figuran como 200 en los logs), el diálogo y el backend aceptan valores negativos o sin sentido físico (CO₂ amplio -5), y PATCH con body vacío devuelve 200.

## Dimensiones

| Dimensión | Puntaje | Peso | Justificación |
|---|---:|---:|---|
| Correctitud funcional | 8.5 | 3 | critic-nav.txt: 10 rutas × 2 viewports err=0, 0 escrituras; critic-sala.txt: /sala Vegetativo 'Rangos: Por defecto' y Secado 'Rangos: Curado' con '—' ×3 en text-fg-faint y badge offline; colores inyectados iguales en home/sala/carpa en ambos viewports (29→warn, 20%→danger, 3.2 kPa→danger; 30/30→warn/warn); rangos caídos → todo text-fg-faint; diálogo rechaza min>max, amplio no contenedor, texto y vacío con mensaje visible. Baja por aceptar -5 en CO₂ amplio (case_negativo saveEnabled true) y PATCH {} → 200 (api-con-token.txt). |
| UI y experiencia | 8 | 3 | Ancla 8: scrollWidth 390/390 y 1440/1440 en las 10 rutas, tab bar dentro del viewport con hit-test ok, grad=0/blur=0 en las 7 principales y /admin/rangos; diálogo móvil con pie fijo (Cancelar 732-768, Guardar 688-724, dialog 63-781) y último campo alcanzable con scroll interno (co2WideMax top 634, hit ok). Restan fases 2-4: carpa Vegetativo blur=1 (bg-zinc-800/50) en ambos viewports, /notificaciones emojis=20, botón flotante del asistente sobre listas móviles. |
| Seguridad y datos | 8.5 | 2 | api-con-token.txt: 7 endpoints en 401 sin token; PATCH string/null/boolean → 400 del NumericBodyInterceptor; min>max, amplio no contenedor, campo extra y array → 400; compose-ps.txt sin puertos al host en los IoT; grep-rangos-frontend.txt vacío; sin secretos en el diff ni en la evidencia del constructor. Baja porque el DTO y el servicio sólo exigen número finito: humedad o CO₂ negativos pasan (stage-ranges.service.ts validate). |
| Código y arquitectura | 8 | 2 | typecheck.txt, lint.txt (exit 0, warnings de línea base), backend-typecheck.txt tsc exit 0, backend-test-stage-ranges.txt 4/4; siembra en onModuleInit con error atrapado, findOne con findUnique y 404; CarpaCard reutiliza isDeviceOn/sectionReadings. Deuda: NumericBodyInterceptor y StageRangesService.validate sin test propio (sólo effective-stage.spec.ts); request-id.interceptor.ts:48-56 loguea statusCode antes del filtro de excepciones y registra 200 en cada 400/401 (backend-logs-mis-patch.txt). |
| Verificación y entrega | 8.5 | 1 | CHANGES.md registra la ronda con marcador, declara su escritura accidental y sus afirmaciones coinciden con lo observado (pie 732/768 y 688/724 exactos, 19/19, 400 del interceptor); app-restart-log.txt: backend 10:49:38 y frontend 11:04:23 OK; qa-nav.txt 19 passed. Baja porque la imagen del frontend (11:04:16) precede al commit 1958eba (11:10:24) y por la falta de test del interceptor que la propia nota describe como pieza clave. |

## Hallazgos (rankeados por impacto)

### 1. [media] El logger HTTP registra statusCode 200 para toda respuesta rechazada: los 400/401 de stage-ranges figuran como escrituras exitosas en los logs

- **Dimensión:** Código y arquitectura
- **Evidencia:** backend/src/common/interceptors/request-id.interceptor.ts:48-56 (finalize lee response.statusCode antes de que el exception filter escriba la respuesta); docs/critica/2026-09-08-1413/backend-logs-mis-patch.txt (mis 9 PATCH/PUT con 400 aparecen como 200) y backend-logs-escrituras-stage-ranges.txt (PUT GERMINACION 200 a las 10:49:55 con updatedAt intacto en 13:05:20Z)
- **Acción:** Loguear en el 'finish' del response de Express (o en un middleware) para capturar el status final, o registrar el error en catchError con su HttpException.getStatus().
- **Verificación:** Un PATCH /api/stage-ranges/DEFAULT con {"tempIdealMin":"99"} queda en los logs con statusCode 400.

### 2. [media] El diálogo y la API aceptan valores negativos o sin sentido físico en los rangos (CO₂ amplio -5, humedad negativa)

- **Dimensión:** Seguridad y datos
- **Evidencia:** docs/critica/2026-09-08-1413/critic-nav.txt → rangos.case_negativo {alerts:[], saveEnabled:true} con co2WideMin=-5 en móvil y desktop; backend/src/modules/stage-ranges/stage-ranges.service.ts validate() sólo exige número finito, min<max y contención; dto/stage-range.dto.ts @IsNumber sin @Min
- **Acción:** Acotar por métrica en el DTO y el servicio (humedad 0-100, CO₂ ≥ 0, VPD ≥ 0, temperatura en un rango plausible) y espejar en validate() del diálogo.
- **Verificación:** PATCH {"co2WideMin":-5} → 400 y el diálogo muestra el error con Guardar deshabilitado.

### 3. [baja] PATCH /stage-ranges/:stage con body vacío devuelve 200 y pasa por update()

- **Dimensión:** Correctitud funcional
- **Evidencia:** docs/critica/2026-09-08-1413/api-con-token.txt sección 'PATCH DEFAULT {}' → HTTP 200 con la fila completa; updatedAt sin cambio (13:47:36.006Z) antes y después; stage-ranges.service.ts patch() no chequea claves
- **Acción:** Rechazar con 400 cuando el body no trae ninguna clave del DTO (o devolver 204 sin tocar la base).
- **Verificación:** PATCH {} → 400 'nada para actualizar'; el log ya no muestra un update.

### 4. [baja] NumericBodyInterceptor y validate() del servicio no tienen test; el interceptor además responde antes que ParseEnumPipe

- **Dimensión:** Código y arquitectura
- **Evidencia:** backend/src/modules/stage-ranges/ sólo tiene effective-stage.spec.ts; api-con-token.txt: PUT /stage-ranges/NOEXISTE con string responde 'tempIdealMin tiene que ser un número' en vez de rechazar la etapa
- **Acción:** Agregar spec unitario del interceptor (string, null, boolean, número) y de validate() (min>max, contención, negativos); aceptable dejar el orden interceptor→pipe si se documenta.
- **Verificación:** npx jest src/modules/stage-ranges pasa con los casos nuevos.

### 5. [baja] Restos de fases 2-4: blur en la carpa Vegetativo, 20 emojis en /notificaciones y console.error de AuthContext al cortar el fetch del perfil por navegación

- **Dimensión:** UI y experiencia
- **Evidencia:** critic-nav.txt: carpa-vegetativo blur=1 (div.relative.overflow-hidden.bg-zinc-800/50) en móvil y desktop, /notificaciones emojis=20; critic-sala.json errors: '[AuthContext] Error fetching user profile: TypeError: Failed to fetch' al navegar justo después del login (frontend/src/contexts/AuthContext.tsx:89)
- **Acción:** Fase 2-4 para blur y emojis; en AuthContext ignorar AbortError/Failed to fetch por navegación en vez de console.error.
- **Verificación:** critic-nav.cjs con blur=[] y emojis=0; navegar inmediatamente tras login sin errores de consola.

### 6. [baja] La imagen publicada del frontend se construyó 6 minutos antes del commit 1958eba

- **Dimensión:** Verificación y entrega
- **Evidencia:** docker image inspect: frontend 2026-09-08T11:04:16-03:00, backend 10:49:16; git log 1958eba 11:10:24; app-restart-log.txt 11:04:23 desde /opt/apps/cultivo-admin/frontend
- **Acción:** Commitear antes de publicar (o republicar después del commit) para que la imagen sea trazable al SHA; equivalencia funcional verificada por navegación.
- **Verificación:** Fecha de la imagen posterior al commit, o etiqueta de build con el SHA.

## Evidencia reunida

**Comandos:**
- `cd frontend && npm run typecheck → docs/critica/2026-09-08-1413/typecheck.txt (exit 0)`
- `cd frontend && npm run lint → lint.txt (exit 0, warnings preexistentes)`
- `cd backend && npx tsc --noEmit → backend-typecheck.txt (exit 0); npx jest src/modules/stage-ranges → backend-test-stage-ranges.txt (4/4)`
- `grep -rnE '(temp|hum|vpd)[A-Za-z]*\s*(<|>|<=|>=)\s*[0-9]' frontend/src → grep-rangos-frontend.txt (vacío)`
- `set -a; . ~/.config/secrets/cultivo-admin-login.env; set +a; QA_LABEL=../../critica/2026-09-08-1413/qa-nav npm run qa:nav → qa-nav.txt (19 passed) + qa-nav/`
- `NODE_PATH=frontend/node_modules node docs/critica/2026-09-08-1413/critic-nav.cjs → critic-nav.txt/critic-nav.json (exit 0; login por formulario; 10 rutas × 2 viewports con consola, scrollWidth, tab bar hit-test, degradés/blur, ceros; selector de sala; /admin/rangos con diálogo, pie en viewport al abrir y tras scroll, 8 casos de validación, Cancelar, reapertura, Escape; sheet Más y sidebar; colores inyectados por page.route en /, /sala y carpa con 3 lecturas; GET /stage-ranges forzado a 500) — 0 escrituras en ambos viewports`
- `node docs/critica/2026-09-08-1413/critic-sala.cjs → critic-sala.txt/.json (tarjetas de /sala en las 2 salas × 2 viewports)`
- `curl sin token GET stage-ranges/sections/rooms/users/auth/me + PUT/PATCH stage-ranges → api-con-token.txt (7×401); con token admin: GET 200 (api-stage-ranges.json), PATCH string/número min>max/amplio/campo extra/null/boolean/array → 400, PATCH {} → 200 (updatedAt sin cambio), PUT NOEXISTE → 400`
- `curl GET /rooms/:id/sections ×2, GET /sections, GET /devices/:id/status ×2 → api-sections.txt, api-room-sections-*.json, api-sections.json (effectiveStage presente; ambos sensores online:false)`
- `docker compose ps → compose-ps.txt; grep ports docker-compose.yml → compose-ports.txt (sólo 127.0.0.1:4000 y 3001)`
- `docker inspect imágenes vs git log 1958eba; grep cultivo /var/log/app-restart.log → app-restart-log.txt`
- `docker logs cultivo-backend → backend-logs-errores.txt, backend-logs-escrituras-stage-ranges.txt, backend-logs-mis-patch.txt`
- `git show 1958eba → diff-1958eba.txt; grep de secretos en docs/rediseno-2026-09/capturas/rangos-r2-20260908 y CHANGES.md (nada); git status --porcelain antes y después → git-status-antes.txt / git-status-despues.txt (idénticos: sólo docs/critica/ y docs/rubrica-critico.md sin trackear)`

**Rutas navegadas:**
- `/login (formulario real, móvil y desktop)`
- `/`
- `/sala`
- `/sala?sala=16fab41e-a1fd-4cc0-be2d-1858e0720133 (cambio de sala por el Select y por URL)`
- `/seguimientos`
- `/automatizaciones`
- `/artefactos`
- `/notificaciones`
- `/admin/usuarios`
- `/admin/rangos (7 filas; Editar 'Por defecto' → diálogo; min>max, texto, amplio sin contener, vacío, coma decimal, negativo, exponente; scroll interno hasta co2WideMax; Cancelar; reabrir; Escape)`
- `/admin/rangos desde el sheet Más (móvil) y desde la sidebar (desktop)`
- `/sala/carpa/ba2f7493-8f0b-45f1-99b6-5427d014de75 (Secado, 'Rangos: Curado'; con lecturas inyectadas y con rangos en 500)`
- `/sala/carpa/f1ed3032-cf56-4487-90a3-0d79dfd3f9b3 (Vegetativo, 'Rangos: Por defecto')`

**Capturas:**
- `docs/critica/2026-09-08-1413/capturas/login-movil.png`
- `docs/critica/2026-09-08-1413/capturas/login-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/home-movil.png`
- `docs/critica/2026-09-08-1413/capturas/home-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/sala-movil.png`
- `docs/critica/2026-09-08-1413/capturas/sala-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/sala-cambiada-movil.png`
- `docs/critica/2026-09-08-1413/capturas/sala-cambiada-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/seguimientos-movil.png`
- `docs/critica/2026-09-08-1413/capturas/seguimientos-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/automatizaciones-movil.png`
- `docs/critica/2026-09-08-1413/capturas/automatizaciones-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/artefactos-movil.png`
- `docs/critica/2026-09-08-1413/capturas/artefactos-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/notificaciones-movil.png`
- `docs/critica/2026-09-08-1413/capturas/notificaciones-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/admin-usuarios-movil.png`
- `docs/critica/2026-09-08-1413/capturas/admin-usuarios-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-movil.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-dialogo-movil.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-dialogo-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-dialogo-invalido-movil.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-dialogo-invalido-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-dialogo-texto-movil.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-dialogo-texto-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-dialogo-final-movil.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-dialogo-final-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-tras-cancelar-movil.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-tras-cancelar-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-desde-menu-movil.png`
- `docs/critica/2026-09-08-1413/capturas/admin-rangos-desde-menu-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/mas-sheet-movil.png`
- `docs/critica/2026-09-08-1413/capturas/carpa-secado-movil.png`
- `docs/critica/2026-09-08-1413/capturas/carpa-secado-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/carpa-vegetativo-movil.png`
- `docs/critica/2026-09-08-1413/capturas/carpa-vegetativo-desktop.png`
- `docs/critica/2026-09-08-1413/capturas/color-todo_ok-{home,sala,carpa}-{movil,desktop}.png`
- `docs/critica/2026-09-08-1413/capturas/color-mixto-{home,sala,carpa}-{movil,desktop}.png`
- `docs/critica/2026-09-08-1413/capturas/color-borde-{home,sala,carpa}-{movil,desktop}.png`
- `docs/critica/2026-09-08-1413/capturas/rangos-caidos-{home,sala,carpa}-{movil,desktop}.png`
- `docs/critica/2026-09-08-1413/qa-nav/ (19 capturas desktop y mobile de la suite qa:nav, incluida 08_admin_rangos)`

## No evaluado

- PUT/PATCH con usuario de rol USER (403): sin credencial de un usuario no admin; verificado por código (RolesGuard + @Roles(ADMIN)).
- Guardado real desde el diálogo y repintado de home/carpa tras un cambio: exigiría un PUT válido en producción. Escritura declarada: mi PATCH /stage-ranges/DEFAULT con body {} devolvió 200; updatedAt quedó en 13:47:36.006Z antes y después, sin cambio observable.
- npm run build del frontend y del backend: no corridos por tiempo; typecheck, lint, tsc, jest y qa:nav sí. La imagen publicada responde con la pantalla y la API nuevas.
- Colores ok/warn/danger con lecturas reales: los dos sensores devuelven online:false; los colores se verificaron inyectando la respuesta de /devices/:id/status en el navegador (sin tocar la base).
