# Automatización de Cultivo Casero

Sistema de administración y monitoreo para cultivo indoor/outdoor casero. Permite gestionar salas de cultivo, carpas, invernaderos, artefactos y plantas.

## Arquitectura

```
automatizacion-cultivo/
├── docker-compose.yml      # Orquestador de servicios
├── backend/                # API NestJS + Prisma (Puerto 4000)
├── frontend/               # Aplicación Next.js (Puerto 3001)
├── sonoff-service/         # API para dispositivos Sonoff (Puerto 3000)
├── tuya-service/           # API para dispositivos Tuya (Puerto 3002)
└── tapo-service/           # API para cámara Tapo (Puerto 3003)
```

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                             │
│                          http://localhost:3001                           │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ HTTP (API centralizada)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (NestJS + Prisma)                          │
│                       http://localhost:4000/api                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Rooms     │  │  Devices    │  │   Cycles    │  │   Events    │    │
│  │  Sections   │  │  (IoT)      │  │   Plants    │  │  (Bitácora) │    │
│  └─────────────┘  └──────┬──────┘  │   Strains   │  └─────────────┘    │
└──────────────────────────┼─────────┴─────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  Sonoff Service │ │ Tuya Service│ │  Tapo Service   │
│   :3000         │ │   :3002     │ │    :3003        │
│  (eWeLink API)  │ │ (Cloud API) │ │  (RTSP/Snap)    │
└─────────────────┘ └─────────────┘ └─────────────────┘
          │                │                │
          ▼                ▼                ▼
    [Dispositivos IoT: Sensores, Enchufes, Cámaras]
```

## Requisitos

- Docker y Docker Compose
- Cuenta de Supabase (para base de datos PostgreSQL)
- (Opcional) Node.js 20+ para desarrollo local

## Inicio Rápido

```bash
# 1. Clonar el repositorio
cd automatizacion-cultivo

# 2. Configurar variables de entorno de los microservicios IoT
cp sonoff-service/.env.example sonoff-service/.env
cp tuya-service/.env.example tuya-service/.env
cp tapo-service/.env.example tapo-service/.env
# Editar los archivos .env con tus credenciales

# 3. Configurar el backend (ver sección "Configuración del Backend")
cp backend/env.example backend/.env
# Editar backend/.env con tu DATABASE_URL de Supabase

# 4. Levantar todos los servicios (build inicial)
docker compose up -d --build

# 5. Crear las tablas en la base de datos (primera vez)
cd backend && npm install && npx prisma db push

# 6. Ver logs en tiempo real
docker compose logs -f
```

### Validación Obligatoria (Docker Compose)

La validación de cambios en este proyecto se realiza **siempre** con Docker Compose.

```bash
# Reconstruir y levantar todo el stack
docker compose up -d --build

# Verificar estado de servicios
docker compose ps

# Revisar logs del frontend y backend
docker compose logs frontend --tail 100
docker compose logs backend --tail 100
```

Notas:
- Para validar integración completa, **no usar** `npm run build`, `npm start` o `npm run dev` local como criterio final.
- Node local puede usarse para edición/lint/typecheck puntuales, pero la validación final es con Docker.

### Configuración del Backend

El backend requiere una base de datos PostgreSQL. Usamos **Supabase** (gratis):

1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear un nuevo proyecto
3. Ir a **Settings** → **Database** → **Connection string**
4. Copiar la URL del **Transaction Pooler** (puerto 6543)
5. Configurar en `backend/.env`:

```env
# IMPORTANTE: Usar Transaction Pooler (puerto 6543) para Docker
# URL-encode caracteres especiales en la contraseña: ? → %3F, $ → %24
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_KEY="tu-anon-key"
```

### URLs de Acceso

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost:3001 | Interfaz de usuario |
| Backend API | http://localhost:4000/api | API REST principal |
| Backend Docs | http://localhost:4000/docs | Documentación Swagger |
| Sonoff API | http://localhost:3000 | API dispositivos Sonoff/eWeLink |
| Sonoff Docs | http://localhost:3000/docs | Documentación Swagger |
| Tuya API | http://localhost:3002 | API dispositivos Tuya |
| Tuya Docs | http://localhost:3002/docs | Documentación Swagger |
| Tapo API | http://localhost:3003 | API cámara Tapo (RTSP/Snapshot) |
| Tapo Docs | http://localhost:3003/docs | Documentación Swagger |

---

## Backend (NestJS + Prisma)

API central que gestiona la lógica de negocio, persistencia y orquestación de los microservicios IoT.

### Tecnologías

- **NestJS** - Framework Node.js
- **Prisma** - ORM para PostgreSQL
- **Supabase** - Base de datos y Storage
- **Swagger** - Documentación de API

### Endpoints Principales

#### Ubicaciones
- `GET /api/rooms` - Listar salas
- `POST /api/rooms` - Crear sala
- `GET /api/rooms/:id/sections` - Secciones de una sala
- `GET /api/sections/:id/dashboard` - Dashboard con dispositivos y plantas

#### Dispositivos IoT
- `GET /api/devices` - Listar dispositivos registrados
- `GET /api/devices/scan` - Escanear Sonoff, Tuya y Tapo
- `GET /api/devices/health` - Estado de conectores
- `POST /api/devices/assign` - Asignar dispositivo a sección
- `POST /api/devices/:id/control` - Controlar (on/off)
- `GET /api/devices/:id/status` - Estado en tiempo real

#### Cultivo
- `GET/POST /api/strains` - Gestión de genéticas
- `GET/POST /api/cycles` - Gestión de ciclos
- `POST /api/cycles/:id/complete` - Completar ciclo
- `GET/POST /api/plants` - Gestión de plantas
- `PATCH /api/plants/:id/move` - Mover planta o cambiar etapa

#### Bitácora
- `GET /api/events` - Listar eventos con filtros
- `GET /api/events/stats` - Estadísticas de eventos
- `POST /api/events/water` - Registrar riego
- `POST /api/events/note` - Crear nota
- `POST /api/events/environment` - Parámetros ambientales
- `POST /api/events/photo` - Subir foto

#### Automatizaciones
- `GET /api/automations` - Listar automatizaciones
- `POST /api/automations` - Crear automatización
- `GET /api/automations/:id` - Detalle de automatización
- `PATCH /api/automations/:id/status` - Cambiar estado (ACTIVE/PAUSED/DISABLED)
- `POST /api/automations/:id/execute` - Ejecutar manualmente
- `GET /api/automations/:id/executions` - Historial de ejecuciones
- `GET /api/automations/:id/effectiveness` - Estadísticas de efectividad

**Tipos de automatización:**
- **SCHEDULED**: Basada solo en horarios (rango horario, intervalo, horas específicas)
- **CONDITION**: Basada en condiciones de sensores
- **HYBRID**: Combinación de horarios + condiciones

#### Asistente de IA
- `POST /api/ai-assistant/chat` - Enviar mensaje al asistente
- `GET /api/ai-assistant/conversations` - Listar conversaciones
- `GET /api/ai-assistant/conversations/:id` - Obtener conversación
- `POST /api/ai-assistant/conversations` - Crear nueva conversación
- `DELETE /api/ai-assistant/conversations/:id` - Eliminar conversación
- `GET /api/ai-assistant/memories` - Obtener memorias
- `POST /api/ai-assistant/memories` - Crear memoria

Ver documentación completa en http://localhost:4000/docs

---

## Frontend (Next.js)

Aplicación web que consume la API centralizada del backend.

### Tecnologías

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Framer Motion** - Animaciones

### Configuración

El frontend se conecta al backend mediante la variable de entorno:

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### Servicios de API

| Servicio | Descripción |
|----------|-------------|
| `apiService.ts` | Cliente HTTP base |
| `deviceService.ts` | Gestión de dispositivos IoT |
| `locationService.ts` | Salas y secciones |
| `growService.ts` | Genéticas, ciclos y plantas |
| `eventService.ts` | Bitácora de eventos |

### Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing con animación de puertas |
| `/sala` | Dashboard de la sala con secciones |
| `/sala/carpa/[id]` | Detalle de una sección (dispositivos y plantas) |
| `/artefactos` | Autodescubrimiento y asignación de dispositivos |
| `/seguimientos` | Gestión de ciclos, plantas y eventos |
| `/automatizaciones` | Sistema de automatizaciones avanzadas (horarios y condiciones) |

### Estado de Interfaz (Rebrand UI)

La UI del frontend está en proceso de rebrand visual progresivo con foco en consistencia, legibilidad y estética premium.

Cambios base ya incluidos:
- Tokens y estilos globales en `frontend/src/styles/tokens.css`.
- Shell/layout y tipografías renovadas (`Manrope` + `Space Grotesk`).
- Actualización de componentes base de UI (`Button`, `Card`, `Badge`, `Modal`).
- Mejoras visuales en `Sala`, `Automatizaciones` y `Carpa`.

Feature flags del rebrand (todas activadas por defecto):

```env
NEXT_PUBLIC_UI_REBRAND_SHELL=true
NEXT_PUBLIC_UI_REBRAND_SALA=true
NEXT_PUBLIC_UI_REBRAND_CARPA=true
NEXT_PUBLIC_UI_REBRAND_AUTOMATIONS=true
```

Si necesitás fallback visual por ruta, podés desactivar la flag correspondiente en entorno.

Para refactors grandes de frontend, usar el flujo de fork documentado en `docs/FRONTEND_FORK_WORKFLOW.md`.

---

## Sonoff Service

Microservicio para controlar el termohigrómetro **Sonoff TH Elite THR320D** con sensor THS01 via eWeLink Cloud API + WebSocket.

### Dispositivos Soportados

- **Sonoff TH Elite THR320D** - Termohigrómetro con relé
- **Sensor THS01** - Temperatura y humedad

### Configuración Sonoff

Variables de entorno (archivo `sonoff-service/.env`):

```env
EWELINK_EMAIL=tu_email@ejemplo.com
EWELINK_PASSWORD=tu_password
EWELINK_REGION=us
DEVICE_NAME=               # Opcional, usa el primer dispositivo si está vacío
```

### Endpoints Sonoff

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check del servicio |
| GET | `/devices` | Listar todos los dispositivos |
| GET | `/device/status` | Temperatura, humedad y estado on/off |
| POST | `/device/power` | Encender/apagar: `{"state": "on"}` o `{"state": "off"}` |
| POST | `/device/toggle` | Alternar estado |

### Ejemplo de Respuesta `/device/status`

```json
{
  "success": true,
  "deviceId": "10018e3624",
  "name": "Termohigometro Indoor",
  "online": true,
  "switch": "on",
  "temperature": "30.0",
  "humidity": "69.3",
  "unit": "celsius"
}
```

---

## Tuya Service

Microservicio para controlar dispositivos Tuya: sensor de calidad de aire (CO2) y enchufes inteligentes.

### Dispositivos Soportados

| Nombre | Tipo | Descripción |
|--------|------|-------------|
| flora-CO2 | Sensor | CO2, Temp, Humedad, PM2.5, VOC, CH2O |
| vege-extractor | Enchufe | Control on/off |
| vege-led-150 | Enchufe | Control on/off |

### Configuración Tuya

1. Crear cuenta en [Tuya IoT Platform](https://iot.tuya.com/)
2. Crear proyecto Cloud: Cloud → Development → Create Cloud Project
3. Vincular cuenta Tuya/Smart Life: Devices → Link Tuya App Account
4. Copiar Access ID y Access Secret desde Overview

Variables de entorno (archivo `tuya-service/.env`):

```env
TUYA_ACCESS_ID=tu_access_id
TUYA_ACCESS_SECRET=tu_access_secret
TUYA_REGION=us
```

### Endpoints Tuya

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check del servicio |
| GET | `/devices` | Listar todos los dispositivos |
| GET | `/device/:id/status` | Estado completo de un dispositivo |
| POST | `/device/:id/power` | Encender/apagar: `{"state": "on"}` o `{"state": "off"}` |
| GET | `/co2/:id` | Lectura del sensor de calidad de aire |

### Ejemplo de Respuesta `/co2/:id`

```json
{
  "success": true,
  "deviceId": "ebfa686328c2caa8a9aafb",
  "name": "flora-CO2",
  "online": true,
  "co2": 407,
  "temperature": 32.2,
  "humidity": 50,
  "unit": {
    "co2": "ppm",
    "temperature": "celsius",
    "humidity": "%"
  },
  "rawStatus": {
    "air_quality_index": "level_1",
    "pm25_value": 21,
    "pm1": 15,
    "pm10": 24,
    "voc_value": 6,
    "ch2o_value": 4
  }
}
```

---

## Tapo Service

Microservicio para cámara **TP-Link Tapo C100**: stream RTSP y captura de snapshots.

### Dispositivos Soportados

- **TP-Link Tapo C100** - Cámara WiFi con visión nocturna

### Configuración Tapo

1. Abrir app Tapo en el celular
2. Seleccionar la cámara → Configuración → Avanzado → Cuenta de cámara
3. Crear usuario y contraseña para acceso RTSP

Variables de entorno (archivo `tapo-service/.env`):

```env
TAPO_CAMERA_IP=192.168.68.64
TAPO_USERNAME=tu_usuario_camara
TAPO_PASSWORD=tu_password_camara
```

### Endpoints Tapo

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check del servicio |
| GET | `/camera` | Información de la cámara |
| GET | `/stream` | URL del stream RTSP |
| POST | `/snapshot` | Capturar imagen actual |
| GET | `/snapshots` | Listar capturas guardadas |
| GET | `/snapshots/:filename` | Descargar imagen |
| DELETE | `/snapshots` | Limpiar capturas antiguas |

### Streams RTSP

| Calidad | Stream | Resolucion |
|---------|--------|------------|
| Alta | `stream1` | 1920x1080 |
| Baja | `stream2` | 640x360 |

---

## Comandos Docker

```bash
# Comando recomendado para aplicar cambios y validar el stack completo
docker compose up -d --build

# Ver estado de servicios
docker compose ps

# Construir imágenes
docker compose build

# Levantar servicios
docker compose up -d

# Ver logs
docker compose logs -f

# Logs de un servicio específico
docker compose logs backend -f
docker compose logs frontend -f
docker compose logs sonoff-service -f
docker compose logs tuya-service -f
docker compose logs tapo-service -f

# Detener servicios
docker compose down

# Reconstruir y levantar
docker compose up --build -d

# Reconstruir sin caché
docker compose build --no-cache

# Eliminar todo (incluyendo volúmenes)
docker compose down -v
```

## Desarrollo Local (solo para iterar, no para validar)

Usar esta modalidad únicamente para desarrollo puntual. La validación oficial del proyecto debe hacerse con Docker Compose.

### Backend

```bash
cd backend
npm install
# Configurar .env con DATABASE_URL de Supabase
npx prisma db push    # Crear tablas
npm run start:dev
```

Acceder a http://localhost:4000/docs

### Frontend

```bash
cd frontend
npm install
# Configurar .env.local (opcional, usa localhost:4000 por defecto)
npm run dev
```

Acceder a http://localhost:3000

### Sonoff Service

```bash
cd sonoff-service
npm install
# Configurar .env
npm run dev
```

### Tuya Service

```bash
cd tuya-service
npm install
# Configurar .env
npm run dev
```

### Tapo Service

```bash
cd tapo-service
npm install
# Configurar .env
# Requiere ffmpeg instalado para snapshots
npm run dev
```

---

## Modelo de Datos

### Entidades Principales

| Entidad | Descripción |
|---------|-------------|
| **Room** | Salas/espacios físicos (ej: "Habitación Cultivo") |
| **Section** | Carpas/sectores (ej: "Carpa Floración 120x120") |
| **Device** | Dispositivos IoT vinculados a conectores |
| **Strain** | Genéticas/variedades de plantas |
| **Cycle** | Ciclos de cultivo/seguimientos |
| **Plant** | Plantas individuales con tracking de etapa y estado de salud |
| **Event** | Bitácora (riegos, fotos, notas, ambiente) |

### Tipos de Dispositivos

| Tipo | Descripción |
|------|-------------|
| SENSOR | Sensores de temperatura/humedad/CO2 |
| LUZ | Luces LED, HPS, etc. |
| EXTRACTOR | Extractores de aire |
| VENTILADOR | Ventiladores de circulación |
| HUMIDIFICADOR | Humidificadores |
| DESHUMIDIFICADOR | Deshumidificadores |
| AIRE_ACONDICIONADO | Aires acondicionados |
| BOMBA_RIEGO | Sistemas de riego |
| CALEFACTOR | Calefactores |
| CAMARA | Cámaras de vigilancia |

### Etapas de Plantas

| Etapa | Descripción |
|-------|-------------|
| GERMINACION | Primeros días de vida |
| VEGETATIVO | Crecimiento de estructura |
| FLORACION | Desarrollo de flores |
| SECADO | Post-cosecha |
| CURADO | Maduración final |

### Estados de Salud

| Estado | Descripción |
|--------|-------------|
| HEALTHY | Planta saludable |
| INFECTED | Planta con plaga o enfermedad |
| DEAD | Planta muerta |

### Conectores IoT

| Conector | Descripción |
|----------|-------------|
| SONOFF | Dispositivos eWeLink/Sonoff |
| TUYA | Dispositivos Tuya/Smart Life |
| TAPO | Cámaras TP-Link Tapo |

---

## Asistente de IA

El sistema incluye un **Asistente de Inteligencia Artificial** con arquitectura de agente orquestado que utiliza OpenAI Function Calling para acceder dinámicamente a la información del sistema.

### Características

- 🤖 **Agente Orquestado**: Utiliza OpenAI GPT-5.2 con Function Calling para razonamiento multi-paso
- 🔧 **17 Herramientas Disponibles**: Acceso a plantas, planes, dispositivos, automatizaciones y contexto
- 💾 **Memoria Persistente**: Memorias por conversación, ciclo, sección y planta
- 📸 **Análisis de Imágenes**: Soporte para análisis de fotos compartidas o del historial
- 🎯 **Contexto Dinámico**: Solo obtiene la información necesaria según la consulta
- 🔐 **Aislamiento Multiusuario**: Cada usuario solo accede a sus propios datos

### Herramientas del Agente

| Categoría | Herramientas |
|-----------|-------------|
| **Plantas** | `get_plant_details`, `search_plants`, `get_plant_photos`, `get_plant_events` |
| **Planes** | `get_prevention_plan`, `get_feeding_plan`, `list_plans`, `get_plants_by_plan` |
| **Infraestructura** | `get_section_details`, `get_section_devices`, `get_sensor_readings`, `get_active_cycle` |
| **Automatizaciones** | `get_automation`, `list_automations`, `get_automation_executions` |
| **Contexto** | `search_memories`, `get_conversation_history`, `get_recent_events` |

### Flujo del Agente

```
Usuario: "¿Qué opinas del plan de prevención de la 048?"
    ↓
1. Agente analiza → Llama get_plant_details("048")
2. Obtiene datos → Ve que tiene plan "Preventivo X"
3. Llama get_prevention_plan("Preventivo X")
4. Analiza resultados → Genera respuesta final
```

### Configuración

```env
# backend/.env
OPENAI_API_KEY=sk-proj-...
```

El asistente está disponible en toda la aplicación mediante una burbuja flotante en la esquina inferior derecha.

Ver documentación completa en [docs/RESUMEN_AUTOMATIZACIONES.md](./docs/RESUMEN_AUTOMATIZACIONES.md)

---

## Sistema Multiusuario

El sistema soporta múltiples usuarios con diferentes niveles de suscripción. Cada usuario tiene su propio espacio aislado con sus salas, plantas, dispositivos y configuraciones.

### Niveles de Suscripción

| Feature | BASIC | PRO | PREMIUM |
|---------|-------|-----|---------|
| Salas de cultivo | 1 | 3 | Ilimitado |
| Secciones por sala | 2 | 5 | Ilimitado |
| Automatizaciones | 0 | 10 | Ilimitado |
| Dispositivos IoT | 3 | 10 | Ilimitado |
| Asistente IA | No | Limitado | Completo |

### Autenticación

El sistema soporta **dos modos de autenticación**:

#### Modo 1: Login Local (sin Supabase) ✅ Recomendado para desarrollo

Funciona sin configuración adicional. Todos los usuarios se autentican contra la base de datos local.

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN LOCAL                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ADMIN (credenciales por defecto):                         │
│   └── Email: admin  /  Password: admin                      │
│                                                             │
│   USUARIOS (creados por admin):                             │
│   └── Email: lo que definas  /  Password: lo que definas    │
│                                                             │
│   Todos usan el mismo formulario de login                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Flujo para crear usuarios:**

1. Inicia sesión como admin (`admin` / `admin`)
2. Ve a **Admin** (botón en la esquina superior derecha)
3. Click en **"Nuevo Usuario"**
4. Completa el formulario:
   - **Nombre**: Nombre del usuario
   - **Email**: Será su username para login
   - **Contraseña**: Mínimo 6 caracteres
   - **Suscripción**: BASIC, PRO o PREMIUM
5. El usuario ya puede hacer login con su email y contraseña

#### Modo 2: Supabase Auth (Opcional)

Para ambientes de producción con auto-registro de usuarios:

1. Crear cuenta en [Supabase](https://supabase.com)
2. Configurar en `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```
3. Los usuarios pueden registrarse solos
4. Al primer login, se crea perfil con plan BASIC

### Cambiar Credenciales del Admin

Por defecto el admin usa `admin/admin`. Para cambiarlo, configura en `backend/.env`:

```env
ADMIN_USER=tu_email_admin
ADMIN_PASSWORD=tu_password_seguro
```

### Migración de Datos Existentes

Si ya tienes datos en la base de datos de antes del sistema multiusuario:

```bash
cd backend
npx ts-node scripts/migrate-to-multiuser.ts
```

Este script:
1. Crea el usuario admin con rol ADMIN y suscripción PREMIUM
2. Asocia todos los datos existentes (salas, plantas, ciclos, etc.) al admin
3. **NO borra ningún dato**

### Panel de Administración de Usuarios

Accesible desde `/admin/usuarios` (solo para rol ADMIN):

- Ver lista de usuarios con estadísticas (salas, dispositivos, ciclos)
- Crear nuevos usuarios con contraseña
- Editar usuarios (nombre, email, rol, suscripción)
- Desactivar/Reactivar usuarios
- Ver nivel de suscripción de cada usuario

### Endpoints de Usuarios (Admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/users` | Listar todos los usuarios |
| POST | `/api/users` | Crear usuario (con password) |
| PATCH | `/api/users/:id` | Actualizar usuario |
| DELETE | `/api/users/:id` | Desactivar usuario |
| PATCH | `/api/users/:id/reactivate` | Reactivar usuario |
| GET | `/api/users/me/profile` | Perfil del usuario actual |
| GET | `/api/users/me/subscription` | Límites de suscripción |

### Credenciales IoT por Usuario

Cada usuario puede configurar sus propias credenciales para servicios IoT (Sonoff, Tuya, Tapo):

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/iot-credentials` | Listar credenciales del usuario |
| POST | `/api/iot-credentials/:connector` | Configurar credenciales |
| POST | `/api/iot-credentials/:connector/test` | Probar conexión |
| GET | `/api/iot-credentials/instructions` | Instrucciones de configuración |

### Aislamiento de Datos

Cada usuario solo ve y accede a sus propios datos:

- ✅ Salas de cultivo (`Room`)
- ✅ Secciones/Carpas (`Section`)
- ✅ Dispositivos IoT (`Device`)
- ✅ Ciclos de cultivo (`Cycle`)
- ✅ Plantas (`Plant`)
- ✅ Genéticas (`Strain`)
- ✅ Planes de alimentación (`FeedingPlan`)
- ✅ Planes de prevención (`PreventionPlan`)
- ✅ Notificaciones (`Notification`)
- ✅ Conversaciones con IA (`AIConversation`)
- ✅ Memorias del Asistente (`AIMemory`)
- ✅ Credenciales IoT (`UserIoTCredential`)

### Asistente de IA Multiusuario

El asistente de IA tiene aislamiento completo de datos por usuario:

```
┌─────────────────────────────────────────────────────────────┐
│                 ASISTENTE IA - MULTIUSUARIO                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Usuario A                      Usuario B                   │
│  ┌─────────────────┐           ┌─────────────────┐         │
│  │ Conversaciones  │           │ Conversaciones  │         │
│  │ Memorias        │           │ Memorias        │         │
│  │ Plantas: 048,049│           │ Plantas: 001,002│         │
│  │ Planes: Plan A  │           │ Planes: Plan X  │         │
│  │ Carpas: Flora   │           │ Carpas: Vege    │         │
│  └─────────────────┘           └─────────────────┘         │
│           │                            │                    │
│           └──────── AISLADOS ──────────┘                    │
│                                                             │
│  El LLM solo recibe contexto del usuario autenticado        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Características del aislamiento:**

- **Herramientas filtradas**: Todas las 17 herramientas del agente filtran por `userId`
- **Conversaciones privadas**: Cada usuario tiene su propio historial de chat
- **Memorias aisladas**: Las memorias persistentes son por usuario
- **Datos exclusivos**: El LLM solo puede acceder a plantas, planes, dispositivos y automatizaciones del usuario logueado
- **Sin mezcla de contexto**: Imposible que el asistente revele datos de otro usuario

---

## Roadmap

- [x] Backend con base de datos (PostgreSQL/Supabase)
- [x] Integración con Sonoff Service (eWeLink API + WebSocket)
- [x] Integración con Tuya Service (Cloud API)
- [x] Integración con Tapo Service (RTSP/Snapshots)
- [x] Documentación Swagger para APIs
- [x] Frontend integrado con API centralizada
- [x] Autodescubrimiento de dispositivos IoT
- [x] Persistencia de dispositivos y plantas
- [x] CRUD completo de ciclos y plantas
- [x] Bitácora de eventos (riego, fotos, notas)
- [x] Gestión de genéticas
- [x] **Sistema de automatizaciones avanzadas** (horarios programados, condiciones, híbridas)
- [x] **Asistente de IA con arquitectura de agente orquestado**
- [x] **Asistente de IA con aislamiento de datos multiusuario**
- [x] **Sistema multiusuario con autenticación local y Supabase Auth**
- [x] **Niveles de suscripción (BASIC, PRO, PREMIUM)**
- [x] **Panel de administración de usuarios (ABM completo)**
- [x] **Login local con password hash (bcrypt)**
- [x] **Credenciales IoT por usuario**
- [x] **Dashboard Ejecutivo (Resumen de estado)**
- [x] **Edición completa de plantas**
- [x] **Seguimiento de estado de salud (Sano/Infectado/Muerto)**
- [ ] Gráficos históricos de sensores
- [ ] Notificaciones push
- [ ] Ejecutor automático de automatizaciones (cron job)
- [ ] WebSockets para actualizaciones en tiempo real

## 📚 Documentación

### Módulos Principales

- **[Sistema de Automatizaciones Avanzadas](./docs/AUTOMATIZACIONES_AVANZADAS.md)**: Documentación completa del sistema de automatizaciones, incluyendo tipos de automatización (programadas, por condición, híbridas), configuración de horarios, múltiples condiciones y acciones, y ejemplos de uso.

- **[Sistema de Planes de Alimentación](./docs/PLANES_DE_ALIMENTACION.md)**: Documentación completa del sistema de planes de alimentación, incluyendo importación, asignación a plantas, integración con eventos de riego y visualización en historial.

- **[Changelog - Planes de Alimentación](./docs/CHANGELOG_PLANES_ALIMENTACION.md)**: Documentación técnica detallada de todos los cambios realizados, incluyendo nuevos archivos, modificaciones, endpoints y componentes.

- **[Changelog - Visualización de Eventos de Planta](./docs/CHANGELOG_EVENTOS_PLANTA.md)**: Documentación técnica de la funcionalidad de visualización interactiva de eventos de planta en la página de detalle de carpa, incluyendo selección de plantas, carga de eventos y diseño visual.

- **[Changelog - Automatizaciones de Fotos y Control de Alertas](./docs/CHANGELOG_AUTOMATIZACIONES_FOTOS_ALERTAS.md)**: Documentación técnica de las mejoras al sistema de automatizaciones, incluyendo automatización de captura de fotos periódicas con registro en historial de plantas, control de alertas/notificaciones, y paginación del historial de ejecuciones.

### Características Documentadas

- ✅ **Sistema multiusuario** con login local (password hash) y Supabase Auth opcional
- ✅ **Panel de administración de usuarios** (crear, editar, desactivar, cambiar suscripción)
- ✅ **Niveles de suscripción** (BASIC, PRO, PREMIUM) con límites configurables
- ✅ **Aislamiento de datos por usuario** (cada usuario ve solo sus datos)
- ✅ **Asistente de IA multiusuario** (cada usuario tiene conversaciones, memorias y contexto aislados)
- ✅ **Sistema de automatizaciones avanzadas** (horarios programados, condiciones de sensores, híbridas)
- ✅ **Automatización de captura de fotos periódicas** con registro automático en historial de plantas
- ✅ **Control de alertas/notificaciones** en automatizaciones
- ✅ **Paginación del historial de ejecuciones** (5 ejecuciones por página)
- ✅ Gestión de planes de alimentación (importación, asignación, eliminación)
- ✅ Integración con eventos de riego (valores por defecto, cálculo de totales)
- ✅ Visualización mejorada en historial (nutrientes, notas)
- ✅ Visualización interactiva de eventos de planta (click para ver últimos 3 eventos)
- ✅ API endpoints completos
- ✅ Componentes React reutilizables

## Licencia

MIT
