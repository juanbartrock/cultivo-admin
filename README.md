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

# 4. Levantar todos los servicios
docker compose up -d

# 5. Crear las tablas en la base de datos (primera vez)
cd backend && npm install && npx prisma db push

# 6. Ver logs en tiempo real
docker compose logs -f
```

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
# Construir imágenes
docker compose build

# Levantar servicios
docker compose up -d

# Ver logs
docker compose logs -f

# Logs de un servicio específico
docker compose logs backend -f
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

## Desarrollo Local (sin Docker)

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
| **Plant** | Plantas individuales con tracking de etapa |
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

### Conectores IoT

| Conector | Descripción |
|----------|-------------|
| SONOFF | Dispositivos eWeLink/Sonoff |
| TUYA | Dispositivos Tuya/Smart Life |
| TAPO | Cámaras TP-Link Tapo |

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
- [ ] Autenticación de usuarios
- [ ] Gráficos históricos de sensores
- [ ] Notificaciones y alertas
- [ ] Control automático por parámetros
- [ ] WebSockets para actualizaciones en tiempo real

## Licencia

MIT
