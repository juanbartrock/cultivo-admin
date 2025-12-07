# Módulo de Artefactos - Documentación Técnica

## Resumen

Este módulo permite gestionar los dispositivos IoT (artefactos) del sistema de cultivo. Implementa autodescubrimiento de dispositivos desde múltiples conectores (Sonoff, Tuya, Tapo) y permite asignarlos a ubicaciones específicas (sala, carpas, invernadero).

## Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │ deviceService   │───>│ ArtefactosPage                      │ │
│  │ fetchAllDevices │    │  ├─ Dispositivos Disponibles (cards)│ │
│  └────────┬────────┘    │  └─ Artefactos Asignados (tabla)    │ │
│           │             └─────────────────────────────────────┘ │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│                    Conectores IoT                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Sonoff:3000 │  │ Tuya:3002   │  │ Tapo:3003   │           │
│  │ /devices    │  │ /devices    │  │ /camera     │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└───────────────────────────────────────────────────────────────┘
```

## Estado Actual de Persistencia

> **IMPORTANTE**: Actualmente los artefactos asignados se mantienen **solo en memoria**.
> Al recargar la página, las asignaciones se pierden.

Esta es una decisión intencional para la fase actual del proyecto. La persistencia real será implementada cuando se desarrolle el backend con base de datos.

## Contrato para el Backend Futuro

Cuando se implemente el backend, deberá exponer los siguientes endpoints:

### Endpoints Requeridos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/artefactos` | Lista todos los artefactos asignados |
| POST | `/api/artefactos` | Asigna un nuevo dispositivo a una ubicación |
| PUT | `/api/artefactos/:id` | Modifica la asignación (nombre, ubicación, tipo) |
| DELETE | `/api/artefactos/:id` | Desasigna un dispositivo |

### Modelo de Datos Sugerido

```typescript
// Tabla: artefactos
interface ArtefactoEntity {
  id: string;              // UUID
  dispositivo_id: string;  // ID del dispositivo en el conector original
  conector: string;        // 'sonoff' | 'tuya' | 'tapo'
  nombre: string;          // Nombre personalizado por el usuario
  tipo: string;            // 'sensor' | 'luz' | 'extractor' | etc.
  ubicacion_tipo: string;  // 'sala' | 'carpa' | 'invernadero'
  ubicacion_id: string;    // ID de la ubicación específica
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Ejemplo de Request/Response

**POST /api/artefactos**
```json
// Request
{
  "dispositivoId": "10018e3624",
  "conector": "sonoff",
  "nombre": "Termohigrómetro Flora",
  "tipo": "sensor",
  "ubicacionTipo": "carpa",
  "ubicacionId": "carpa-flora"
}

// Response
{
  "success": true,
  "artefacto": {
    "id": "art-uuid-123",
    "dispositivoId": "10018e3624",
    "conector": "sonoff",
    "nombre": "Termohigrómetro Flora",
    "tipo": "sensor",
    "ubicacionTipo": "carpa",
    "ubicacionId": "carpa-flora",
    "createdAt": "2025-12-06T20:00:00Z"
  }
}
```

## Flujo de Usuario

1. Usuario entra a `/artefactos`
2. Sistema escanea automáticamente todos los conectores
3. Se muestran los dispositivos detectados en el panel superior
4. Usuario hace clic en "Asignar" en un dispositivo
5. Se abre modal para:
   - Personalizar el nombre
   - Seleccionar tipo de artefacto
   - Elegir ubicación
6. Al confirmar, el dispositivo pasa a "Artefactos Asignados"
7. Usuario puede desasignar dispositivos en cualquier momento

## Archivos Relacionados

- `frontend/src/app/artefactos/page.tsx` - Página principal
- `frontend/src/services/deviceService.ts` - Servicio de comunicación con conectores
- `frontend/src/types/index.ts` - Tipos TypeScript (DispositivoConector, Artefacto)
- `frontend/src/data/mockData.ts` - Opciones de tipos y ubicaciones

## Conectores Soportados

| Conector | Puerto | Endpoint | Dispositivos |
|----------|--------|----------|--------------|
| Sonoff | 3000 | `/devices` | Termohigrómetro THR320D |
| Tuya | 3002 | `/devices` | Sensores CO2, enchufes inteligentes |
| Tapo | 3003 | `/camera` | Cámara Tapo C100 |

## Configuración de URLs

Las URLs de los conectores se pueden configurar mediante variables de entorno:

```env
NEXT_PUBLIC_SONOFF_URL=http://localhost:3000
NEXT_PUBLIC_TUYA_URL=http://localhost:3002
NEXT_PUBLIC_TAPO_URL=http://localhost:3003
```

---

*Última actualización: Diciembre 2025*
