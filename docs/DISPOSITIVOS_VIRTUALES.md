# Dispositivos Virtuales y Dependencias

## Descripción General

Esta funcionalidad permite registrar **dispositivos físicos** (como extractores, deshumidificadores, etc.) que **no tienen conexión directa a internet**, pero que son **controlados por otro dispositivo IoT** (típicamente un sensor Sonoff con salida de relé).

### Caso de Uso Principal

Un termohigrómetro Sonoff tiene:
- Sensor de temperatura y humedad
- Una salida ON/OFF (relé)

Esta salida controla físicamente otro artefacto (extractor, deshumidificador, etc.) que no tiene conexión WiFi propia.

**Antes:** Solo se registraba el Sonoff, sin saber qué artefacto controlaba.

**Ahora:** Se puede registrar el extractor como "dispositivo virtual" que depende del Sonoff.

---

## Arquitectura

### Modelo de Datos (Prisma)

```prisma
enum Connector {
  SONOFF
  TUYA
  TAPO
  ESP32
  VIRTUAL  // Dispositivos controlados por otros (no tienen conexión directa)
}

model Device {
  id         String     @id @default(uuid())
  name       String
  connector  Connector
  externalId String     @map("external_id")
  type       DeviceType
  sectionId  String?    @map("section_id")
  section    Section?   @relation(...)
  metadata   Json?

  // Relación de dependencia (auto-referencial)
  controlledByDeviceId String?  @map("controlled_by_device_id")
  controlledBy         Device?  @relation("DeviceControl", fields: [controlledByDeviceId], references: [id], onDelete: SetNull)
  controlledDevices    Device[] @relation("DeviceControl")

  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  @@unique([connector, externalId])
  @@map("devices")
}
```

### Flujo de Datos

```
┌─────────────────────┐
│  Extractor Virtual  │ ◄── connector: VIRTUAL
│  (sin WiFi propio)  │     controlledByDeviceId: [sonoff-id]
└─────────┬───────────┘
          │ "controlado por"
          ▼
┌─────────────────────┐
│  Sonoff TH Elite    │ ◄── connector: SONOFF
│  (sensor + relé)    │     controlledDevices: [extractor-id]
└─────────────────────┘
          │
          ▼ (conexión física)
    ┌───────────┐
    │ Extractor │
    │  (220V)   │
    └───────────┘
```

---

## Backend

### DTOs Actualizados

**`AssignDeviceDto`** y **`CreateDeviceDto`** ahora incluyen:

```typescript
@ApiPropertyOptional({
  description: 'ID del dispositivo que controla a este',
})
@IsUUID()
@IsOptional()
controlledByDeviceId?: string;
```

### Servicio de Dispositivos

#### Estado de Dispositivos Virtuales

Cuando se consulta el estado de un dispositivo VIRTUAL, el backend:
1. Busca el dispositivo controlador (`controlledBy`)
2. Consulta el estado del controlador
3. Hereda el estado ON/OFF del controlador

```typescript
// devices.service.ts
if (device.connector === Connector.VIRTUAL) {
  if (device.controlledBy) {
    const controllerStatus = await this.iotGateway.getDeviceStatus(
      device.controlledBy.connector,
      device.controlledBy.externalId,
    );
    
    // Normalizar estado (Sonoff usa 'switch', otros usan 'state')
    const switchValue = controllerStatus.switch as string | undefined;
    const stateValue = controllerStatus.state;
    const rawState = stateValue || switchValue;
    const inheritedState: 'on' | 'off' | undefined = 
      rawState === 'on' ? 'on' : rawState === 'off' ? 'off' : undefined;
    
    return {
      device,
      status: {
        online: controllerStatus.online,
        state: inheritedState,
        switch: switchValue,
        controlledBy: {
          id: device.controlledBy.id,
          name: device.controlledBy.name,
          connector: device.controlledBy.connector,
        },
      },
    };
  }
}
```

#### Control de Dispositivos Virtuales

Cuando se envía un comando ON/OFF a un dispositivo VIRTUAL:
1. Se busca el dispositivo controlador
2. Se envía el comando al controlador real

```typescript
if (device.connector === Connector.VIRTUAL) {
  if (!device.controlledBy) {
    return { success: false, message: 'Sin controlador asignado' };
  }
  
  // Controlar el dispositivo padre
  const result = await this.iotGateway.controlDevice(
    device.controlledBy.connector,
    device.controlledBy.externalId,
    action,
  );
  
  return { device, action, controlledThrough: device.controlledBy, result };
}
```

### IoT Gateway Service

El conector VIRTUAL tiene manejo especial:

```typescript
// No tiene URL de microservicio
[Connector.VIRTUAL]: ''

// scanConnector() - No se puede escanear
if (connector === Connector.VIRTUAL) return [];

// getDeviceStatus() - Estado delegado al service
case Connector.VIRTUAL:
  return { online: true, state: undefined };

// controlDevice() - No se controla directamente
case Connector.VIRTUAL:
  return { success: false, message: 'Virtual devices are controlled through their parent device' };

// checkConnectorHealth() - Siempre healthy
if (connector === Connector.VIRTUAL) return true;
```

---

## Frontend

### Página de Dispositivos (`/artefactos`)

#### Botón "Agregar Virtual"

Se agregó un botón en el header para crear dispositivos virtuales:

```tsx
<button
  onClick={() => setShowVirtualModal(true)}
  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
>
  <Plus className="w-5 h-5" />
  Agregar Virtual
</button>
```

#### Modal de Creación

Permite configurar:
- **Nombre**: Ej. "Extractor Carpa Flora"
- **Tipo**: EXTRACTOR, DESHUMIDIFICADOR, HUMIDIFICADOR, etc.
- **Sección**: A qué carpa/sección pertenece
- **Controlado por**: Seleccionar el dispositivo que lo controla (opcional)

### DeviceControlCard

Muestra información adicional para dispositivos virtuales:

```tsx
{device.connector === 'VIRTUAL' && (
  <p className="text-xs text-cyan-400 mb-3">
    {device.controlledBy 
      ? `→ Controlado por: ${device.controlledBy.name}` 
      : '⚠️ Sin controlador asignado'
    }
  </p>
)}
```

### Colores de Badge

Se agregaron colores para los nuevos conectores:

```typescript
const conectorColors: Record<Connector, string> = {
  SONOFF: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TUYA: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  TAPO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ESP32: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  VIRTUAL: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};
```

---

## Tipos TypeScript (Frontend)

```typescript
// types/index.ts
export type Connector = 'SONOFF' | 'TUYA' | 'TAPO' | 'ESP32' | 'VIRTUAL';

export interface Device {
  id: string;
  name: string;
  connector: Connector;
  externalId: string;
  type: DeviceType;
  sectionId?: string;
  section?: Section;
  metadata?: Record<string, unknown>;
  
  // Dependencias
  controlledByDeviceId?: string;
  controlledBy?: Device;
  controlledDevices?: Device[];
  
  createdAt: string;
  updatedAt: string;
}

export interface AssignDeviceDto {
  connector: Connector;
  externalId: string;
  sectionId: string;
  name?: string;
  type?: DeviceType;
  metadata?: Record<string, unknown>;
  controlledByDeviceId?: string;
}
```

---

## Uso

### Crear un Dispositivo Virtual

1. Ir a **Dispositivos** (`/artefactos`)
2. Click en **"Agregar Virtual"** (botón cyan)
3. Completar:
   - Nombre: "Extractor Secado"
   - Tipo: "Extractor"
   - Sección: "Secado"
   - Controlado por: "Termohigometro Indoor" (el Sonoff)
4. Click en **"Crear Dispositivo"**

### Comportamiento Esperado

- El extractor virtual aparecerá en la sección "Secado"
- Mostrará "→ Controlado por: Termohigometro Indoor"
- Su estado ON/OFF reflejará el estado del Sonoff
- Al presionar ON/OFF en el extractor, se enviará el comando al Sonoff
- En el Sonoff (sensor), aparecerá "→ Controla: Extractor Secado"

---

## API Endpoints

### GET /api/devices
Devuelve todos los dispositivos con sus relaciones `controlledBy` y `controlledDevices`.

### GET /api/devices/:id/status
Para dispositivos VIRTUAL, devuelve el estado heredado del controlador.

### POST /api/devices/assign
Crea o actualiza un dispositivo, incluyendo la relación `controlledByDeviceId`.

### POST /api/devices/:id/control
Para dispositivos VIRTUAL, envía el comando al dispositivo controlador.

---

## Notas Técnicas

1. **externalId para VIRTUAL**: Se genera automáticamente como `virtual-{timestamp}`
2. **Cascada de eliminación**: Si se elimina el controlador, `controlledByDeviceId` se pone en NULL (onDelete: SetNull)
3. **Prevención de ciclos**: Un dispositivo no puede controlarse a sí mismo
4. **Compatibilidad Sonoff**: El estado puede venir como `switch` o `state`, se normaliza a `'on' | 'off'`






