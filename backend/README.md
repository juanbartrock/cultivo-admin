# Cultivo Manager - Backend

Backend API para gestión de cultivos con integración IoT.

## Stack Tecnológico

- **Runtime:** Node.js 20+
- **Framework:** NestJS
- **Base de Datos:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Almacenamiento:** Supabase Storage
- **Documentación:** Swagger/OpenAPI

## Requisitos

- Node.js 20+
- npm o yarn
- Cuenta de Supabase (https://supabase.com)

## Instalación

```bash
# Instalar dependencias
npm install

# Generar cliente de Prisma
npm run prisma:generate

# Crear archivo de configuración
cp env.example .env
# Editar .env con tus credenciales
```

## Configuración de Supabase

### 1. Obtener la URL de conexión

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Settings** → **Database**
3. En la sección **Connection string**, selecciona **Transaction pooler** (Mode: Transaction)
4. Copia la URI de conexión

### 2. Configurar el archivo `.env`

```env
# Server
PORT=4000
NODE_ENV=development

# Database (Supabase PostgreSQL - Transaction Pooler)
# IMPORTANTE: Usa el Transaction Pooler (puerto 6543) para compatibilidad con Docker
# Si tu contraseña tiene caracteres especiales, debes URL-encodearlos:
#   ? → %3F
#   $ → %24
#   @ → %40
#   # → %23
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Supabase Storage (para subir fotos)
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_KEY="tu-anon-key"
SUPABASE_BUCKET_NAME="grow-photos"

# Microservicios IoT (URLs internas en Docker)
MS_SONOFF_URL="http://sonoff-service:3000"
MS_TUYA_URL="http://tuya-service:3000"
MS_TAPO_URL="http://tapo-service:3000"
```

### 3. Crear las tablas en Supabase

```bash
# Sincronizar schema con la base de datos
npm run prisma:push

# O aplicar migraciones (recomendado para producción)
npm run prisma:migrate
```

## Base de Datos - Schema

El backend gestiona las siguientes entidades:

| Entidad | Descripción |
|---------|-------------|
| **Room** | Salas/espacios físicos |
| **Section** | Carpas/sectores dentro de una sala |
| **Device** | Dispositivos IoT (Sonoff, Tuya, Tapo) |
| **Strain** | Genéticas/variedades |
| **Cycle** | Ciclos de cultivo/seguimientos |
| **Plant** | Plantas individuales |
| **Event** | Bitácora de eventos (riego, fotos, notas) |

## Desarrollo

```bash
# Iniciar en modo desarrollo (con hot-reload)
npm run start:dev

# Iniciar en modo debug
npm run start:debug

# Abrir Prisma Studio (GUI para la DB)
npm run prisma:studio
```

## Docker

El backend se ejecuta como parte del stack con Docker Compose:

```bash
# Desde la raíz del proyecto
docker compose up -d backend

# Ver logs del backend
docker compose logs -f backend

# Reconstruir después de cambios
docker compose up --build -d backend
```

### Troubleshooting Docker

**Error: "Can't reach database server"**
- Asegúrate de usar el **Transaction Pooler** (puerto 6543) en lugar de la conexión directa (puerto 5432)
- La conexión directa requiere IPv6, que Docker no soporta por defecto

**Error: "invalid port number" o caracteres especiales**
- URL-encode los caracteres especiales en la contraseña
- Ejemplo: `mi?pass$word` → `mi%3Fpass%24word`

## API Endpoints

Una vez iniciado, accede a:

- **Swagger UI:** http://localhost:4000/docs
- **Health Check:** http://localhost:4000/health

### Ubicaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/rooms` | Listar salas |
| POST | `/api/rooms` | Crear sala |
| GET | `/api/rooms/:id` | Detalle de sala |
| GET | `/api/rooms/:id/sections` | Secciones de una sala |
| GET | `/api/sections` | Listar todas las secciones |
| POST | `/api/sections` | Crear sección |
| GET | `/api/sections/:id/dashboard` | Dashboard con dispositivos y plantas |

### Dispositivos IoT

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/devices` | Listar dispositivos registrados |
| GET | `/api/devices/scan` | Escanear todos los conectores IoT |
| GET | `/api/devices/health` | Estado de salud de los conectores |
| POST | `/api/devices/assign` | Asignar dispositivo a sección |
| GET | `/api/devices/:id/status` | Estado en tiempo real |
| POST | `/api/devices/:id/control` | Controlar (on/off) |

### Cultivo

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/strains` | Listar genéticas |
| POST | `/api/strains` | Crear genética |
| GET | `/api/cycles` | Listar ciclos |
| POST | `/api/cycles` | Crear ciclo |
| GET | `/api/cycles/:id` | Detalle con plantas y eventos |
| POST | `/api/cycles/:id/complete` | Marcar ciclo como completado |
| GET | `/api/plants` | Listar plantas |
| POST | `/api/plants` | Registrar planta |
| PATCH | `/api/plants/:id/move` | Mover planta o cambiar etapa |

### Bitácora de Eventos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/events` | Listar eventos (con filtros) |
| GET | `/api/events/stats` | Estadísticas por tipo |
| POST | `/api/events/water` | Registrar riego |
| POST | `/api/events/note` | Crear nota |
| POST | `/api/events/photo` | Subir foto (multipart) |
| POST | `/api/events/environment` | Parámetros ambientales |

## Estructura del Proyecto

```
backend/
├── src/
│   ├── main.ts                 # Entry point + Swagger config
│   ├── app.module.ts           # Root module
│   ├── health.controller.ts    # Health check endpoint
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts   # Conexión a DB
│   ├── common/
│   │   ├── dto/                # DTOs compartidos
│   │   └── enums/              # Enums TypeScript
│   └── modules/
│       ├── locations/          # Rooms + Sections
│       ├── devices/            # Devices + IoT Gateway
│       ├── grow/               # Cycles + Plants + Strains
│       ├── events/             # Events + Storage
│       ├── automations/        # Sistema de automatizaciones
│       └── ai-assistant/       # Asistente IA con agente orquestado
│           ├── tools/          # Herramientas del agente (17 tools)
│           │   ├── plants.tools.ts
│           │   ├── plans.tools.ts
│           │   ├── infrastructure.tools.ts
│           │   ├── automations.tools.ts
│           │   ├── context.tools.ts
│           │   ├── tool-registry.ts
│           │   └── tool-executor.ts
│           ├── agent-orchestrator.service.ts  # Loop del agente
│           ├── ai-assistant.service.ts        # Servicio principal
│           ├── memory.service.ts              # Gestión de memorias
│           └── context-builder.service.ts     # Construcción de contexto
├── prisma/
│   └── schema.prisma           # Schema de la DB
├── Dockerfile
├── env.example
└── package.json
```

## Asistente de IA

El backend incluye un módulo completo de asistente de IA con arquitectura de agente orquestado.

### Arquitectura

El asistente utiliza **OpenAI Function Calling** para acceder dinámicamente a la información del sistema mediante herramientas especializadas. En lugar de hacer un "dump" masivo de contexto, el agente razona sobre qué información necesita y la obtiene bajo demanda.

### Componentes Principales

- **AgentOrchestratorService**: Maneja el loop del agente (máximo 10 iteraciones)
- **ToolRegistry**: Registro central de todas las herramientas disponibles
- **ToolExecutor**: Ejecuta las herramientas llamadas por el modelo
- **MemoryService**: Gestiona memorias persistentes por conversación/ciclo/sección/planta
- **Tools**: 17 herramientas especializadas organizadas por categoría

### Herramientas Disponibles

#### Plantas (4 herramientas)
- `get_plant_details`: Detalles completos de una planta por código
- `search_plants`: Buscar plantas por criterios múltiples
- `get_plant_photos`: Obtener fotos del historial
- `get_plant_events`: Historial de eventos de una planta

#### Planes (4 herramientas)
- `get_prevention_plan`: Plan de prevención completo con aplicaciones
- `get_feeding_plan`: Plan de alimentación completo con semanas
- `list_plans`: Listar todos los planes disponibles
- `get_plants_by_plan`: Plantas asignadas a un plan

#### Infraestructura (5 herramientas)
- `get_system_overview`: Resumen general del sistema
- `get_section_details`: Detalles de una sección/carpa
- `get_section_devices`: Dispositivos de una sección
- `get_sensor_readings`: Lecturas históricas de sensores
- `get_active_cycle`: Información del ciclo activo

#### Automatizaciones (3 herramientas)
- `get_automation`: Detalles completos de una automatización
- `list_automations`: Listar automatizaciones con filtros
- `get_automation_executions`: Historial de ejecuciones

#### Contexto (3 herramientas)
- `search_memories`: Buscar en memorias del asistente
- `get_conversation_history`: Historial de conversaciones
- `get_recent_events`: Eventos recientes del sistema

### Configuración

```env
# backend/.env
OPENAI_API_KEY=sk-proj-...
```

### Logging Detallado

El sistema incluye logging extensivo para análisis del flujo:

- **AIAssistantService**: Logs de entrada/salida de solicitudes
- **AgentOrchestratorService**: Logs del loop del agente, iteraciones, llamadas al LLM
- **ToolExecutor**: Logs de ejecución de cada herramienta con parámetros y resultados

Los logs incluyen:
- Mensajes del usuario
- Herramientas utilizadas y sus parámetros
- Estructura de mensajes enviados al LLM
- Iteraciones del agente
- Tokens consumidos
- Errores detallados

### Modelo de Datos

El asistente utiliza las siguientes tablas en Prisma:

- **AIConversation**: Conversaciones con contexto (GENERAL, CYCLE, SECTION, PLANT)
- **AIMessage**: Mensajes de usuario y asistente con imágenes
- **AIMemory**: Memorias persistentes por tipo (CONVERSATION, CYCLE, SECTION, PLANT)

## Licencia

MIT
