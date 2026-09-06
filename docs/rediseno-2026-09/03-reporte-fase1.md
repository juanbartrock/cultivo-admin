# Reporte de la fase 1 — shell nuevo, sistema de diseño y home única

<!-- [agent:cultivo-admin][date:2026-09-05][action:created] -->

Rama `redisenio-2026-09`, sin push. Publicado en `https://cultivo.ramsesvii.com`.

---

## 1. Commits

| Commit | Bloque | Qué |
|---|---|---|
| `178b3da` | — | reporte de la fase 0 (quedaba sin commitear) |
| `d56e034` | 1 | tokens del brief en `globals.css` + `tailwind.config.ts`, shadcn/ui instalado, componentes propios duplicados eliminados, fuera `featureFlags.ts` y `styles/tokens.css` |
| `f22a7e3` | 2 | `AppShell` en el layout raíz, `Header.tsx` y los cinco `layout.tsx` por ruta eliminados, `PageHeader` en todas las páginas |
| `9663ca1` | 3 | home operativa en `/`, `DoorAnimation` eliminado, `/sala` con `Select` en el `PageHeader` y `?sala=<id>` |
| `76816fa` | 4 | `<select>` nativos de primer nivel al `Select` de shadcn, degradés y `backdrop-blur` fuera de login, registro, toasts y modales |
| `3610aba` | 5 | correcciones que salieron del QA visual: alertas por carpa, dimensiones sin duplicar en Carpa, anillo animado de la burbuja fuera |
| `b4a0d0f` | 5 | la línea de alerta muestra carpa y métrica sin truncar en móvil |

97 archivos, +4.689 / −2.146 (sin contar `package-lock.json`).

## 2. Archivos

**Nuevos**
- `src/components/shell/`: `AppShell.tsx`, `Sidebar.tsx`, `MobileTopBar.tsx`, `MobileTabBar.tsx`,
  `MoreSheet.tsx`, `UserMenu.tsx`, `PageHeader.tsx`, `ShellContext.tsx`, `nav.ts`,
  `useUnreadCount.ts`, `index.ts`.
- `src/features/home/`: `screens/HomePage.tsx`, `hooks/useHomeDashboard.ts`, `lib/readings.ts`,
  `components/` (`AlertsBlock`, `CarpaStatusCard`, `ActiveCyclesBlock`, `DeviceIssuesBlock`,
  `OutdoorWeatherBlock`, `BlockError`, `HomeSection`).
- `src/components/ui/`: 17 componentes de shadcn/ui más `modal.tsx`, `confirm-dialog.tsx` y
  `empty-state.tsx` escritos sobre ellos. `components.json`.

**Eliminados**
- `src/components/Header.tsx`, `src/components/NotificationDropdown.tsx`,
  `src/components/DoorAnimation.tsx`, `src/features/sala/components/RoomSelector.tsx`.
- `src/app/{sala,seguimientos,automatizaciones,artefactos,notificaciones}/layout.tsx`.
- `src/lib/featureFlags.ts`, `src/styles/tokens.css`.
- `src/components/ui/{Badge,Button,Card,ConfirmDialog,EmptyState,Modal,Skeleton}.tsx`.

## 3. Salidas reales

### Build local (`frontend/`)

```
npm run typecheck   → sin salida, exit 0
npm run lint        → exit 0, solo warnings preexistentes (img, exhaustive-deps,
                      import/no-anonymous-default-export)
npm run build       → ✓ Compiled successfully
```

### Publicación

```
$ app-restart cultivo-frontend --build
...
 Container cultivo-frontend Started
[app-restart] cultivo-frontend running · puerto 3001 escuchando
EXIT=0
```

Cuatro corridas con exit 0 (una por iteración del QA visual). La última es la que está en línea.

### `QA_LABEL=fase1 npm run qa:nav`

```
Running 17 tests using 2 workers
  ✓  1 [setup] › login por formulario (1.6s)
  ✓  2 [desktop] › recorrido: home
  ✓  3 [desktop] › recorrido: automatizaciones
  ✓  4 [desktop] › recorrido: artefactos
  ✓  5 [desktop] › recorrido: sala
  ✓  6 [desktop] › recorrido: notificaciones
  ✓  7 [desktop] › recorrido: admin de usuarios
  ✓  8 [desktop] › recorrido: primera carpa
  ✓  9 [mobile]  › recorrido: home
  ✓ 10 [mobile]  › recorrido: sala
  ✓ 11 [desktop] › recorrido: ciclos
  ✓ 12 [mobile]  › recorrido: primera carpa
  ✓ 13 [mobile]  › recorrido: automatizaciones
  ✓ 14 [mobile]  › recorrido: artefactos
  ✓ 16 [mobile]  › recorrido: notificaciones
  -  15 [mobile] › recorrido: ciclos            (test.fixme)
  -  17 [mobile] › recorrido: admin de usuarios (test.fixme)

  2 skipped
  15 passed (43.8s)
QA_EXIT=0
```

Los dos `test.fixme` siguen. Medí el ancho real de cada ruta en 390 px después del shell:

| Ruta | Ancho | Elemento que desborda |
|---|---|---|
| `/` | 390 | — |
| `/sala` | 390 | — |
| `/seguimientos` | **469** | `div.flex.gap-2` con los botones "Agregar Planta" y "Registrar Evento" del detalle del ciclo |
| `/automatizaciones` | 390 | — |
| `/artefactos` | 390 | — |
| `/notificaciones` | 390 | — |
| `/admin/usuarios` | **511** | la fila de cada usuario (`div.p-4.bg-zinc-800/50…`) |

El shell no aporta ancho en ninguna: los dos desbordes son contenido interno de fases 3 y 4. Dejé
esa medición escrita en el motivo de cada `test.fixme`.

### Recorrido manual con Playwright

Login → home → abrir una carpa desde la tarjeta → volver por el breadcrumb → Ciclos → Más
(móvil) → Notificaciones → Cerrar sesión → `/login`. Desktop 1440×900 y móvil 390×844.

```
[desktop] login -> /
[desktop] vuelta -> /sala
[desktop] logout -> /login
[mobile] login -> /
[mobile] mas -> dispositivos ok
[mobile] vuelta -> /sala?sala=225305da-c624-43ff-916f-b68049aa2cd1
[mobile] ancho de ciclos: 469
[mobile] ciclos -> mas -> notificaciones ok
[mobile] logout -> /login
sin errores de consola, pageerror ni 5xx
```

### Capturas

`docs/rediseno-2026-09/capturas/fase1/` — 34 PNG:

- `desktop-0X_*.png` / `mobile-0X_*.png`: las 8 rutas del recorrido de `qa:nav`, full page.
- `recorrido-desktop-*.png` (7) y `recorrido-mobile-*.png` (8): el recorrido manual paso a paso,
  incluidos `recorrido-desktop-08_menu_usuario.png` (dropdown de usuario) y
  `recorrido-mobile-06_mas.png` (`Sheet` de "Más").
- `badge-mobile-contador-simulado.png`: el contador de no leídas con la respuesta de
  `/api/notifications/unread-count` interceptada en 7. Explicación abajo.

## 4. Qué se hizo, bloque por bloque

### Bloque 1 — tokens y shadcn/ui

`globals.css` declara los 19 tokens del brief en `:root` como canales RGB
(`--surface-2: 23 31 27; /* #171f1b */`) para que Tailwind pueda aplicarles opacidad con
`rgb(var(--token) / <alpha-value>)`; el hex de referencia va en el comentario de cada línea.
`tailwind.config.ts` los expone como `bg`, `surface`, `surface-2`, `surface-3`, `edge`,
`edge-strong`, `fg`, `fg-muted`, `fg-faint`, `accent{,-hover,-fg,-soft}`, `ok`, `warn`, `danger`,
`info`, `offline`, más los radios 6/10/14 (`rounded-sm|md|lg`), la sombra única (`shadow-float`),
`font-display` y la escala 12/14/16/20/24/32.

Las variables de shadcn (`--background`, `--card`, `--popover`, `--primary`, `--border`,
`--destructive`, …) apuntan a los tokens del brief, así que los componentes salen ya con la
paleta. Donde shadcn usa `accent` como color de hover (`hover:bg-accent`) reemplacé por
`bg-surface-2`, porque en este sistema `accent` es el verde de acción y un hover verde sería
justo lo contrario de lo que pide el brief.

`cultivo.*` sigue en el config: quedan 192 usos, todos en pantallas de las fases 2-4.

### Bloque 2 — AppShell

`AppShell` se monta una vez en `src/app/layout.tsx` y se aparta en `/login` y `/register`.
Mientras `AuthContext` verifica la sesión muestra el esqueleto del shell, sin spinner.

Desktop ≥1024: sidebar fija de 240 px que colapsa a 64 px con el estado en
`localStorage['cultivo.sidebar.collapsed']`; colapsada cada ítem lleva `Tooltip`. Abajo, el menú
de usuario (inicial, nombre, plan) con "Usuarios" si `isAdmin` y "Cerrar sesión". Contenido en
`max-w-[1400px]` con padding 24 px.

Móvil: barra superior de 56 px con título de la página (o flecha atrás + título en la ruta hija),
campana con contador y avatar; barra inferior de 5 pestañas (Inicio · Salas · Ciclos ·
Automatizaciones · Más) y `Sheet` de "Más" con Dispositivos, Notificaciones, Usuarios y Cerrar
sesión.

El título de la barra superior lo registra `PageHeader` en un contexto del shell; si una página
todavía no montó su encabezado, cae al nombre de la ruta.

El contador de no leídas vive en el shell: una sola query de React Query
(`notificationService.countUnread()`), refresco cada 60 s y invalidación ante el evento `alert`
del gateway de tiempo real, que es lo único útil que emite hoy.

Carpa muestra breadcrumb `Salas › <sala> › <carpa>` en desktop y flecha atrás en móvil; perdió
el "Volver a la sala" propio. Notificaciones y Usuarios quedaron dentro del shell.

### Bloque 3 — home única

`/` es el dashboard: alertas por carpa, tarjetas de carpa (temperatura, humedad y VPD con color
de estado, plantas, etapa predominante, dispositivos encendidos como chips), ciclos activos con
días y último evento, dispositivos sin respuesta y clima exterior. Tres queries de cliente
(`/sections`, `/cycles?status=ACTIVE`, `/events?limit=50`) más el polling de estados que ya
existía. **No toqué el backend.**

Sin dato es `—`: se terminaron los `0 °C` y `0 %` del clima caído. Cada bloque falla solo, con
banner `warn` y "Reintentar".

`DoorAnimation` eliminado. El login ya redirigía a `/`, sus dos acciones (Admin, Salir) ahora
viven en el shell y la puerta solo agregaba tiempo entre el login y los datos.

`/sala` perdió el panel "Espacios de cultivo": la sala se elige con un `Select` en el
`PageHeader` y queda en la URL como `?sala=<id>`; `roomId` se sigue aceptando por compatibilidad.
Crear sala, actualizar y eliminar sala pasaron a un `DropdownMenu`.

### Bloque 4 — barrido

`<select>` nativos de primer nivel al `Select` de shadcn: filtro de estado en Ciclos, "Todos los
tipos" en Dispositivos, tipo y estado en Notificaciones. Los de formularios internos esperan a su
fase.

Emojis: no hay ninguno en títulos que venga del frontend. Los que quedan son texto de cuerpo
(`⚠️` en avisos de Carpa y de `DeviceControlCard`) y los del backend en las notificaciones. Sin
tocar, anotado para su fase.

Degradés de marca y `backdrop-blur` fuera del shell, de la home, del login, del registro, de los
toasts, del chat del asistente y de los modales de Sala. `bg-cultivo-dark(er)` reemplazado por
`bg-bg` / `bg-surface` en toda la app.

## 5. Autocrítica contra `01-direccion-visual.md`

### Cumple

- **Tokens**: los 19 del brief, con los radios y la sombra única. Se borraron `tokens.css` y
  `featureFlags.ts` y no queda ninguna clase `ui-rebrand-*`, `rebrand-*`, `surface-panel*`,
  `btn-accent` ni `btn-data`.
- **shadcn/ui sobre Radix instalado de verdad**, con los 17 componentes pedidos mapeados a la
  paleta. Los componentes propios que lo duplicaban se eliminaron.
- **Shell**: sidebar colapsable con memoria, orden de nav del brief, menú de usuario con Cerrar
  sesión, top bar + tab bar + "Más" en móvil, `PageHeader` con breadcrumb. Un solo shell en el
  layout raíz.
- **Una sola home**, con el orden de bloques del brief.
- **Honestidad con los datos**: `—` en vez de ceros, "Clima no disponible" en gris, banner `warn`
  por bloque con "Reintentar".
- **Sin prosa perecedera**: se fueron "¿A qué sala quieres ingresar?", "Selecciona una unidad para
  ver sus detalles" y "Monitoreo y control de tu espacio de cultivo".
- **Cargando**: skeletons en el shell, en Sala, en Usuarios y en la home.
- **Móvil sin overflow** en todas las rutas menos las dos de fases 3 y 4, y por su contenido.

### No cumple todavía

- **La densidad y la tipografía sólo llegan al shell y a la home.** Adentro de Carpa, Ciclos,
  Automatizaciones y Dispositivos siguen los `text-3xl`, los `rounded-2xl`, los `bg-zinc-800/50` y
  los 192 usos de `cultivo-green`. Se ve el corte entre el shell nuevo y el contenido viejo.
- **`backdrop-blur` sigue en 18 archivos internos** (Carpa, Ciclos, Automatizaciones, PlantCard,
  SensorCard, PPFDGrid, HarvestSection, los uploads de planes, la tabla de Dispositivos). Sacarlo
  ahí es rediseñar esas pantallas, o sea las fases 2-4.
- **Un color por tarjeta**: lo saqué de `CarpaCard` (el ícono ya no aporta color de marca), pero
  adentro de Carpa y de Automatizaciones el violeta, el cyan y el naranja siguen decorando.
- **Spinner a pantalla completa**: Carpa dice "Cargando sección..." y Ciclos "Cargando ciclos..."
  con un `Loader2` centrado. El brief pide skeletons. No los toqué porque son el estado de carga
  del contenido que se rediseña en las fases 2 y 3.
- **Acordeones cerrados por defecto en Carpa** (Historial, Plantas, Planes) y la ilustración
  grande arriba: es exactamente lo que el brief manda cambiar por `Tabs`, y es fase 2.
- **`window.confirm` y checkbox nativos**: quedan dentro de las pantallas internas.
- **Alto de tarjeta desparejo en `/sala`**: las carpas sin lectura ambiental no tienen el panel
  inferior, así que la grilla queda escalonada. Es `CarpaCard`, que se rehace en la fase 2.

### Donde me aparté del pedido, y por qué

1. **shadcn CLI v2.10.0 en lugar de `shadcn@latest`.** `latest` es la 4.21.0, que arranca en
   Tailwind 4 y presets nuevos; este frontend es Next 14.2 + Tailwind 3.4. La v2 es la última
   línea compatible con ese stack. Migrar a Tailwind 4 no estaba en el alcance de la fase.
2. **Estilo `default`, base `neutral`, CSS variables**, como pedía el brief (el `init` escribe
   `new-york`; lo cambié en `components.json` antes de agregar los componentes).
3. **`Modal` quedó como componente propio, pero construido sobre el `Dialog` de shadcn.** Sus 8
   usos viven adentro de `CarpaDetailPage` y `SeguimientosPage`, que no se rediseñan en esta fase;
   convertirlos a JSX de `Dialog` a mano era tocar dos archivos de 2.000 líneas sin ganar nada.
   La implementación es una sola y es Radix: foco atrapado, Escape y overlay.
4. **Las alertas de la home no repiten los dispositivos caídos.** El brief pide "sensores fuera
   de rango y dispositivos offline" en el mismo bloque, pero con todos los sensores caídos el
   bloque salía idéntico línea por línea al de "Dispositivos con problema" (lo vi en la primera
   captura). Quedó: una alerta por carpa (lectura fuera de rango, o sensor sin respuesta) con link
   a la carpa, y la lista de dispositivos completa en su propio bloque.
5. **El texto base pasó a 14 px vía la escala de Tailwind (`text-base`), no en `body`.** Cambiar
   el `font-size` del `body` movía el layout de las cuatro pantallas que no se tocan en esta fase.
6. **Rangos de estado inventados por mí**, documentados en `src/features/home/lib/readings.ts`:
   temperatura ideal 18-28 °C / amplio 15-30; humedad 40-65 % / 30-75; VPD 0,8-1,4 kPa /
   0,4-1,6. Fuera del amplio es `danger`, entre amplio e ideal es `warn`. Si tus rangos son otros,
   se cambian en un solo lugar.

## 6. Lo que quedó a medias, con la salida real

**El contador de no leídas no se pudo ver con datos reales.** El backend informa cero:

```
$ curl -s -H "Authorization: Bearer ***" https://cultivo.ramsesvii.com/api/notifications/unread-count
{"count":0}
$ curl -s -H "Authorization: Bearer ***" https://cultivo.ramsesvii.com/api/notifications/summary
{"total":466,"unread":0,"byType":{},"byPriority":{}}
```

Las 486 alertas de clima que reportó el diagnóstico ya están leídas. Verifiqué el badge
interceptando la respuesta de `/api/notifications/unread-count` en 7, sin escribir nada en
producción:

```
desktop ["Notificaciones\n7","7"]
mobile  ["Notificaciones7","7"]
```

Captura: `capturas/fase1/badge-mobile-contador-simulado.png`. Lo que no probé con tráfico real es
el refresco por el evento `alert` del socket, porque no hubo ninguna alerta durante la sesión.

**El desborde de Ciclos rompe el tap de la barra inferior en móvil.** Con `/seguimientos` a
469 px en un viewport de 390, la emulación móvil aleja el visual viewport y el hit-test de los
elementos `fixed` se corre: Playwright no puede tocar la pestaña "Más" ni los ítems del `Sheet`
sin `force`, y el elemento que intercepta es contenido de la página.

```
[mobile] desde /            -> click normal: mas -> dispositivos ok
[mobile] desde /seguimientos (469px) -> hace falta click({force:true})
```

En un teléfono real esto es un tap que puede errar el destino. Lo causa el overflow de la fase 3,
así que no lo arreglé acá, pero conviene subirlo de prioridad en esa fase.

**Código muerto que encontré y no borré** (fuera del alcance, sin efecto en runtime):
`src/components/dashboard/` (`AlertsList`, `DashboardSummary`, `QuickActions`, `StatsGrid`),
`src/components/WeatherWidget.tsx` y `src/services/weatherService.ts` no tienen ningún uso.
`DashboardSummary` es el último `max-w-7xl` que queda en el árbol.

**Sigue vivo lo que no toca esta fase**: Tuya y Sonoff devuelven 500 en el log del backend cada
30 s, por eso la home muestra `—` en las seis carpas y cinco dispositivos sin respuesta. Eso es
exactamente lo que debe mostrar; el problema es de credenciales IoT, no de UI.

## 7. Sorpresas del código que importan para la fase 2 (Sala y Carpa)

- **`GET /sections` ya trae todo lo que necesita una vista de sala**: `room`, `devices`, `plants`
  y `_count`. La home se arma con esa sola llamada. `useSalaDashboard` sigue pidiendo
  `/rooms` + `/rooms/:id` + `/rooms/:id/sections` (tres llamadas) para lo mismo; se puede unificar.
- **El tipo `Section` no declaraba `_count`** aunque el backend lo devuelve desde siempre. Lo
  agregué como opcional en `src/types/index.ts`.
- **`GET /sections/:id/dashboard` incluye `room`**, así que el breadcrumb de Carpa sale sin pedir
  nada extra.
- **`useDevicesStatus` marca `{online:false}` cuando falla el `GET /devices/:id/status`**, y el
  backend responde 200 aun cuando el microservicio IoT devuelve 500. Por eso "dispositivo sin
  respuesta" es detectable desde el cliente y el QA no ve ningún 5xx.
- **`CarpaDetailPage` tiene un editor de layout por sección** (`SectionLayoutEditor`, orden y
  visibilidad de bloques persistidos en `/sections/:id/layout`). Cualquier reorganización en
  `Tabs` tiene que decidir qué pasa con esa configuración: hoy ordena bloques verticales.
- **El `Modal` de la app ahora es Radix**: al partir `CarpaDetailPage` conviene pasar sus modales
  a `Dialog` directamente en vez de arrastrar el wrapper.
- **`CarpaCard` quedó migrado a los tokens** pero conserva su estructura de dos piezas (tarjeta +
  panel inferior condicional), que es lo que genera las alturas desparejas de `/sala`. La fase 2
  puede reemplazarlo por `CarpaStatusCard` de la home, que ya tiene grilla fija de tres lecturas y
  altura pareja.
- **`useSalaDashboard` escribe la sala elegida en la URL** con `router.replace`. Si la fase 2
  agrega más estado a Sala, ese es el lugar.
