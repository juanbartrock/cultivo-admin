<!-- [agent:server-audit][date:2026-09-08][action:created] -->
umbral: 8.0
piso: 6.0

# Rúbrica del crítico — Cultivo Admin

Extiende la rúbrica global de `/opt/server-audit/etc/critic/rubrica-global.md`. Lo que no está
acá se evalúa con la global. Cultivo Admin es el **piloto** de `critic-agent` desde el 2026-09-08.

## Qué es esta app y qué se le exige de mínima

Herramienta operativa para administrar un cultivo indoor: salas, carpas, sensores, dispositivos
IoT (Sonoff, Tuya, Tapo, ESP32), ciclos de cultivo, automatizaciones y notificaciones. Se usa en
el celular dentro de la sala de cultivo y en la PC. Producción: `https://cultivo.ramsesvii.com`.
Stack en el `CLAUDE.md` del proyecto.

Está en un **rediseño por fases** (`docs/rediseno-2026-09/`). El brief visual aprobado es
`docs/rediseno-2026-09/01-direccion-visual.md`: cuando el código lo contradiga, gana el brief.

**Rutas principales** (así se llaman en todo este documento): `/`, `/sala`, `/seguimientos`,
`/automatizaciones`, `/artefactos`, `/notificaciones` y `/admin/usuarios`.

**Fase actual del rediseño:** F0 y F1 publicadas el 2026-09-05 (shell único, sistema de diseño con
tokens y shadcn/ui, home operativa en `/`). F2 a F5 (páginas internas, formularios, etc.) todavía
no se autorizaron: lo que en ellas conserve el diseño viejo se anota como hallazgo, con severidad
según el brief, y se aclara que pertenece a una fase posterior.

Mínimos que se exigen siempre:

- Cada ruta principal carga sin errores de consola, con sesión de admin, en móvil y desktop.
- Las lecturas de sensores muestran "—" cuando no hay dato. Nunca un cero que parezca lectura.
- Los rangos que deciden si un sensor está "normal", "atención" o "crítico" salen de
  configuración de la carpa o del ciclo, nunca de constantes inventadas en el frontend.
- Los microservicios IoT no exponen puertos al host. Solo backend `127.0.0.1:4000` y frontend
  `127.0.0.1:3001`.
- Ninguna credencial (usuario y contraseña, API key, token, JWT) hardcodeada en código ni en
  configuración versionada. La de admin vive fuera del repo, en
  `/home/deploy/.config/secrets/cultivo-admin-login.env` (600, variables `CULTIVO_ADMIN_USER` y
  `CULTIVO_ADMIN_PASSWORD`).

## Pesos (reemplazan los globales mientras dure el rediseño)

| Dimensión | Peso |
|---|---|
| Correctitud funcional | 3 |
| UI y experiencia | 3 |
| Seguridad y datos | 2 |
| Código y arquitectura | 2 |
| Verificación y entrega | 1 |

## Anclas propias para "UI y experiencia"

| Puntaje | Cómo se ve |
|---|---|
| 9 | Sala de control: color solo para estado, tarjetas planas con borde de 1 px, densidad media, tab bar móvil siempre alcanzable, sin frases de bienvenida ni instrucciones decorativas, lecturas con `tabular-nums`, estados vacíos honestos. |
| 8 | Cumple el brief en todas las rutas principales; quedan detalles menores (un espaciado, un icono de otro tamaño) que no confunden al usuario. |
| 7 | Sigue el brief en lo grueso, pero quedan restos del diseño anterior en alguna ruta (degradé, blur, header viejo, select nativo de primer nivel) o algún overflow. |
| 5 | Dos lenguajes visuales conviviendo, navegación que se pierde en móvil, datos falsos por defecto. |
| 0-4 | Rutas rotas, sin navegación posible en móvil, o el shell nuevo ausente. |

## Checks que el crítico corre (desde `frontend/`)

```bash
npm run typecheck
npm run lint
npm run build          # si hay tiempo; el build es el que publica
```

QA navegado contra producción con la credencial de admin:

- Rutas: `/`, `/sala`, `/seguimientos`, `/automatizaciones`, `/artefactos`, `/notificaciones`,
  `/admin/usuarios`. En `/sala`, cambiar de sala con el selector.
- Viewports: 390×844 (móvil) y 1440×900 (desktop).
- Por ruta: captura completa, errores de consola, y en móvil que
  `document.documentElement.scrollWidth` sea igual a `window.innerWidth` y que la tab bar quede
  visible y tocable (su `boundingClientRect` dentro del viewport, sin nada encima).
- Suite existente: `npm run qa:nav` contra producción. Es de navegación, no escribe. Toma la
  credencial de las variables de entorno; cargarlas antes con
  `set -a; . /home/deploy/.config/secrets/cultivo-admin-login.env; set +a`. Si el archivo no
  existe o falla el login, se declara en `no_evaluado` y no se adivina.

El backend se verifica con `curl` a `/api/*` sin token (debe rechazar) y con token de admin
(login por `/api/auth/login`). No crear ni borrar entidades.

<!-- [agent:server-audit][date:2026-09-16][action:created] -->
## Checks de la compuerta

Los corre `critic-gate` desde la raíz de la app, en el árbol actual y en el commit base del loop
(con `node_modules` enlazados). Formato `- nombre: comando`, uno por línea.

- typecheck-frontend: cd frontend && npm run typecheck
- lint-frontend: cd frontend && npm run lint
- typecheck-backend: cd backend && npx tsc --noEmit -p tsconfig.json
- tests-backend: cd backend && npx jest --runInBand --ci

## Fallas duras propias

Además de las globales:

1. Scroll horizontal en móvil (`scrollWidth` > `innerWidth` a 390 px) en cualquiera de las siete
   rutas principales, o tab bar tapada o inalcanzable.
2. Degradé, `backdrop-blur` o glassmorphism en superficies del shell o de las páginas (login y
   registro se evalúan aparte, con el brief).
3. Un cero mostrado como lectura de sensor cuando el backend no devolvió dato.
4. Credencial de acceso hardcodeada en cualquier archivo del repo.
5. Un microservicio IoT con `ports:` al host en `docker-compose.yml`.

## Contexto que el crítico debe conocer

- Rama de trabajo del rediseño: `redisenio-2026-09`. Producción corre lo publicado con
  `app-restart cultivo-frontend --build` y `app-restart cultivo-backend --build`.
- Kill switch de lecturas (2026-09-08): `readings_settings.sensorsEnabled` corta las lecturas
  de todos los SENSOR y `Device.readingsEnabled` corta la consulta de estado de un aparato
  cualquiera sea su tipo. Con el interruptor apagado el backend responde 200 con
  `{"online": false, "readingsPaused": true}` **sin** salir a la red, y no puede quedar ni una
  línea `Error getting status for TUYA/...` en los logs: si aparece con las lecturas apagadas,
  es falla de esta feature. Con el interruptor encendido y el aparato desenchufado, el 500 del
  conector es esperado y no se penaliza. La pantalla distingue los dos casos: pausado va con
  `—` y "Lecturas desactivadas" (token `offline`, sin alerta), caído sigue siendo "Sensor sin
  respuesta". Los interruptores están en `/artefactos` (general arriba y uno por fila) y en la
  home (general, al lado de Actualizar).
- Fuera del alcance del rediseño y conocido: spam de alertas "STORM" de clima. Se menciona si
  aparece, con severidad baja, sin penalizar la tarea evaluada por él.
