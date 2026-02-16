# Cultivo Manager Agent Guide

Sistema de administración y monitoreo para cultivo indoor/outdoor casero.

## Contexto de Desarrollo
- **OS**: Windows 10/11
- **Shell**: PowerShell
- **Runtime**: Docker Compose (OBLIGATORIO) used for all testing and validation.
- **Validación**: SIEMPRE probar la aplicación levantando el stack con `docker compose up`. 
  - ❌ **PROHIBIDO**: Validar cambios usando `npm run build` o `npm start` localmente.
  - ✅ **CORRECTO**: `docker compose up -d --build` para aplicar cambios.

## Documentación Específica
- [Backend Guidelines](./backend/AGENTS.md)
- [Frontend Guidelines](./frontend/AGENTS.md)

## Skill Mapping (Global)
Estas skills estan disponibles en `./.agent/skills/` y deben usarse segun el tipo de tarea:

- `feature-implementation`: Features end-to-end que tocan backend + frontend.
- `refactor-and-cleanup`: Limpieza tecnica, simplificacion, eliminacion de codigo muerto.
- `database-migration`: Cambios de esquema Prisma y migraciones.
- `iot-device-integration`: Integracion de nuevos dispositivos IoT o conectores.
- `ui-design-system`: Cambios de UI, componentes y consistencia visual en frontend.

### Regla de Seleccion
- Si una tarea involucra mas de un dominio, aplicar primero la skill principal por impacto y luego las complementarias.
- Si hay cambio de `backend/prisma/schema.prisma`, `database-migration` es obligatoria.
- Si hay cambio de experiencia visual o componentes, `ui-design-system` es obligatoria.

## Filosofía de Desarrollo
- **Divulgación Progresiva**: Mantener explicaciones concisas. Profundizar solo cuando sea necesario.
- **Calidad**: Código limpio, tipado estricto (TypeScript) y estética "Premium" en frontend.
- **Git**: Usar Conventional Commits (e.g., `feat:`, `fix:`, `docs:`).

## Comandos Comunes (PowerShell)
```powershell
# Levantar todo
docker compose up -d

# Ver logs
docker compose logs -f

# Reconstruir un servicio específico
docker compose up -d --build backend
```
