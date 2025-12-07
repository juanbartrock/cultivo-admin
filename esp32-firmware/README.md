# ESP32-C3 Firmware para Automatización de Cultivo

Firmware para el ESP32-C3-DevKitC-02 v1.1 con control de relays y sensor DHT11.

## Hardware Requerido

- ESP32-C3-DevKitC-02 v1.1
- Módulo Relay de 2 canales
- Sensor DHT11

## Conexiones

| Componente | GPIO | Descripción |
|------------|------|-------------|
| Relay 1    | 8    | Canal 1 del módulo relay |
| Relay 2    | 9    | Canal 2 del módulo relay |
| DHT11      | 10   | Pin de datos del sensor |

### Diagrama de conexión

```
ESP32-C3          Relay Module
--------          ------------
GPIO 8  --------> IN1
GPIO 9  --------> IN2
3.3V    --------> VCC
GND     --------> GND

ESP32-C3          DHT11
--------          -----
GPIO 10 --------> DATA
3.3V    --------> VCC
GND     --------> GND
```

## Instalación

### Opción 1: Arduino IDE

1. Instalar [Arduino IDE](https://www.arduino.cc/en/software)
2. Agregar soporte ESP32:
   - Ir a `File > Preferences`
   - En "Additional Board URLs" agregar:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
3. Ir a `Tools > Board > Boards Manager`
4. Buscar "esp32" e instalar "esp32 by Espressif Systems"
5. Instalar librerías:
   - `Sketch > Include Library > Manage Libraries`
   - Buscar e instalar:
     - "DHT sensor library" by Adafruit
     - "ArduinoJson" by Benoit Blanchon
6. Seleccionar placa: `Tools > Board > ESP32C3 Dev Module`
7. Seleccionar puerto COM
8. Modificar credenciales WiFi en el código
9. Subir el sketch

### Opción 2: PlatformIO

1. Instalar [VS Code](https://code.visualstudio.com/) y extensión PlatformIO
2. Crear proyecto nuevo o usar el `platformio.ini` incluido
3. Modificar credenciales WiFi
4. Build y Upload

## Configuración

Antes de subir el firmware, modificar estas constantes en el archivo `.ino`:

```cpp
const char* WIFI_SSID = "TU_SSID";           // Tu red WiFi
const char* WIFI_PASSWORD = "TU_PASSWORD";    // Tu contraseña
const char* DEVICE_NAME = "carpa1";           // Nombre del dispositivo
const char* MDNS_NAME = "esp32-carpa1";       // Nombre mDNS
```

## API REST

Una vez flasheado, el ESP32 expone estos endpoints:

### GET /
Info básica del dispositivo.

### GET /status
Estado completo del dispositivo.

```json
{
  "deviceId": "carpa1",
  "deviceType": "esp32-relay-dht11",
  "uptime": 3600,
  "relays": {
    "relay1": false,
    "relay2": false
  },
  "sensors": {
    "temperature": 25.5,
    "humidity": 60.0,
    "heatIndex": 26.2
  },
  "wifi": {
    "ssid": "MiRed",
    "rssi": -55,
    "ip": "192.168.1.100"
  }
}
```

### GET /sensors
Lectura de sensores DHT11.

```json
{
  "temperature": 25.5,
  "humidity": 60.0,
  "heatIndex": 26.2,
  "unit": "celsius"
}
```

### POST /relay/1 o /relay/2
Controlar un relay específico.

**Body:**
```json
{
  "state": "on"  // o "off", true, false
}
```

**Response:**
```json
{
  "relayId": 1,
  "state": "on",
  "success": true
}
```

### POST /relay/1/toggle o /relay/2/toggle
Alternar estado de un relay.

**Response:**
```json
{
  "relayId": 1,
  "state": "off",
  "success": true
}
```

## Acceso al dispositivo

Una vez conectado a la red WiFi, puedes acceder al ESP32:

1. **Por IP**: `http://192.168.x.x` (ver en Serial Monitor)
2. **Por mDNS**: `http://esp32-carpa1.local` (si tu red soporta mDNS)

## Solución de problemas

### El ESP32 no aparece como puerto COM
1. Verificar cable USB (debe ser de datos, no solo carga)
2. El ESP32-C3 usa USB nativo, debería aparecer automáticamente
3. Si no aparece, instalar drivers: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

### No conecta al WiFi
1. Verificar credenciales
2. Asegurar que la red es 2.4GHz (no 5GHz)
3. Revisar Serial Monitor para errores

### DHT11 muestra NaN
1. Verificar conexiones
2. Agregar resistencia pull-up de 10kΩ entre DATA y VCC
3. Verificar que el sensor recibe 3.3V
