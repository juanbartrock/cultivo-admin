# Backend Guide (NestJS)

API REST centralizada y orquestador de microservicios IoT.

## Stack
- **Framework**: NestJS 10+ (TypeScript)
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Auth**: Passport (JWT + Local)

## Skill Mapping (Backend)
Skills primarias para tareas en backend:

- `feature-implementation`: Nuevos endpoints, servicios, DTOs y logica de negocio.
- `database-migration`: Cualquier cambio en `backend/prisma/schema.prisma` o migraciones.
- `iot-device-integration`: Cambios en orquestacion de dispositivos o integraciones de conectores.
- `refactor-and-cleanup`: Deuda tecnica, simplificacion de modulos y limpieza de codigo.

### Prioridad Recomendada
1. Si hay cambios de schema, iniciar por `database-migration`.
2. Si hay dispositivos/conectores, aplicar `iot-device-integration`.
3. Para flujo funcional completo, continuar con `feature-implementation`.
4. Cerrar con `refactor-and-cleanup` si corresponde.

## Comandos Comunes
Ejecutar desde la raíz del proyecto o dentro del contenedor.

```powershell
# Instalación
npm install

# Levantar DB local (si aplica) o generar cliente Prisma
npx prisma generate

# Migraciones
npx prisma migrate dev

# Ejecutar server desarrollo
npm run start:dev
```

## Arquitectura y Patrones
- **Modulos**: Cada dominio (e.g., `plants`, `devices`) debe tener su propio módulo.
- **DTOs**: Usar `class-validator` y `class-transformer` para validar entradas. Tipado estricto.
- **Microservicios**: La comunicación con dispositivos IoT se realiza vía HTTP a los microservicios satélites (`sonoff-service`, etc.).
- **Errores**: Usar `HttpException` estándar de NestJS.

## Base de Datos
- No modificar el esquema de `Prisma` sin crear una migración.
- Respetar las relaciones existentes (e.g., `Plant` -> `Cycle` -> `Section`).
