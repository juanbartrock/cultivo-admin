const { TuyaContext } = require('@tuya/tuya-connector-nodejs');

class TuyaClient {
  constructor() {
    this.context = null;
    this.devices = [];
  }

  async initialize() {
    const accessId = process.env.TUYA_ACCESS_ID;
    const accessSecret = process.env.TUYA_ACCESS_SECRET;
    const region = process.env.TUYA_REGION || 'us';

    if (!accessId || !accessSecret) {
      throw new Error('TUYA_ACCESS_ID y TUYA_ACCESS_SECRET son requeridos');
    }

    // Mapeo de regiones a URLs base
    const regionUrls = {
      'us': 'https://openapi.tuyaus.com',
      'eu': 'https://openapi.tuyaeu.com',
      'cn': 'https://openapi.tuyacn.com',
      'in': 'https://openapi.tuyain.com',
    };

    const baseUrl = regionUrls[region] || regionUrls['us'];

    console.log(`[Tuya] Conectando a región: ${region} (${baseUrl})`);

    this.context = new TuyaContext({
      baseUrl,
      accessKey: accessId,
      secretKey: accessSecret,
    });

    // Verificar conexión obteniendo dispositivos
    await this.refreshDevices();

    console.log('[Tuya] Conexión establecida correctamente');
  }

  async refreshDevices() {
    console.log('[Tuya] Obteniendo dispositivos...');

    try {
      // Obtener lista de dispositivos del usuario
      // Nota: Necesitamos el UID del usuario o usar el endpoint de assets
      const response = await this.context.request({
        method: 'GET',
        path: '/v1.0/iot-01/associated-users/devices',
        query: {
          last_row_key: '',
          page_size: 100,
        },
      });

      if (!response.success) {
        // Intentar endpoint alternativo para dispositivos por asset
        console.log('[Tuya] Intentando endpoint alternativo...');
        const altResponse = await this.context.request({
          method: 'GET',
          path: '/v2.0/cloud/thing/device',
          query: {
            page_no: 1,
            page_size: 100,
          },
        });

        if (altResponse.success && altResponse.result) {
          this.devices = altResponse.result.list || [];
        } else {
          console.warn('[Tuya] No se pudieron obtener dispositivos:', altResponse.msg);
          this.devices = [];
        }
      } else {
        this.devices = response.result?.devices || [];
      }

      console.log(`[Tuya] ${this.devices.length} dispositivo(s) encontrado(s)`);

      if (this.devices.length > 0) {
        this.devices.forEach((device, i) => {
          console.log(`  ${i + 1}. ${device.name || device.device_name} (${device.id})`);
        });
      }

      return this.devices;
    } catch (error) {
      console.error('[Tuya] Error obteniendo dispositivos:', error.message);
      throw error;
    }
  }

  async getDevices() {
    await this.refreshDevices();
    return this.devices.map(d => ({
      id: d.id,
      name: d.name || d.device_name,
      category: d.category,
      brand: 'Tuya',
      model: d.product_name,
      online: d.online,
      ip: d.ip,
    }));
  }

  async getDeviceStatus(deviceId) {
    if (!deviceId) {
      throw new Error('deviceId es requerido');
    }

    console.log(`[Tuya] Obteniendo estado del dispositivo: ${deviceId}`);

    const response = await this.context.request({
      method: 'GET',
      path: `/v1.0/iot-03/devices/${deviceId}/status`,
    });

    if (!response.success) {
      throw new Error(`Error obteniendo estado: ${response.msg}`);
    }

    // También obtener info del dispositivo
    const infoResponse = await this.context.request({
      method: 'GET',
      path: `/v1.0/devices/${deviceId}`,
    });

    const deviceInfo = infoResponse.success ? infoResponse.result : {};
    const status = response.result || [];

    // Convertir array de status a objeto
    const statusObj = {};
    status.forEach(s => {
      statusObj[s.code] = s.value;
    });

    return {
      deviceId,
      name: deviceInfo.name,
      category: deviceInfo.category,
      online: deviceInfo.online,
      status: statusObj,
      rawStatus: status,
    };
  }

  async setPowerState(deviceId, state) {
    if (!deviceId) {
      throw new Error('deviceId es requerido');
    }

    if (!['on', 'off'].includes(state)) {
      throw new Error('Estado inválido. Usar "on" o "off"');
    }

    console.log(`[Tuya] Cambiando estado de ${deviceId} a: ${state}`);

    const response = await this.context.request({
      method: 'POST',
      path: `/v1.0/iot-03/devices/${deviceId}/commands`,
      body: {
        commands: [
          {
            code: 'switch',
            value: state === 'on',
          },
        ],
      },
    });

    if (!response.success) {
      // Intentar con código alternativo para algunos dispositivos
      const altResponse = await this.context.request({
        method: 'POST',
        path: `/v1.0/iot-03/devices/${deviceId}/commands`,
        body: {
          commands: [
            {
              code: 'switch_1',
              value: state === 'on',
            },
          ],
        },
      });

      if (!altResponse.success) {
        throw new Error(`Error al cambiar estado: ${response.msg}`);
      }
    }

    return {
      success: true,
      deviceId,
      state,
      message: `Dispositivo ${state === 'on' ? 'encendido' : 'apagado'} correctamente`,
    };
  }

  async getCO2Reading(deviceId) {
    if (!deviceId) {
      throw new Error('deviceId es requerido');
    }

    console.log(`[Tuya] Obteniendo lectura CO2 del dispositivo: ${deviceId}`);

    const status = await this.getDeviceStatus(deviceId);

    // Buscar valores de CO2 en los diferentes códigos posibles
    const co2Codes = ['co2_value', 'co2', 'carbon_dioxide'];
    const tempCodes = ['temp_current', 'temperature', 'va_temperature'];
    const humidityCodes = ['humidity_value', 'humidity', 'va_humidity'];

    let co2 = null;
    let temperature = null;
    let humidity = null;

    for (const code of co2Codes) {
      if (status.status[code] !== undefined) {
        co2 = status.status[code];
        break;
      }
    }

    for (const code of tempCodes) {
      if (status.status[code] !== undefined) {
        temperature = status.status[code];
        // Algunos dispositivos envían temp * 10
        if (temperature > 100) {
          temperature = temperature / 10;
        }
        break;
      }
    }

    for (const code of humidityCodes) {
      if (status.status[code] !== undefined) {
        humidity = status.status[code];
        break;
      }
    }

    return {
      deviceId,
      name: status.name,
      online: status.online,
      co2: co2,
      temperature: temperature,
      humidity: humidity,
      unit: {
        co2: 'ppm',
        temperature: 'celsius',
        humidity: '%',
      },
      rawStatus: status.status,
    };
  }
}

// Singleton
const client = new TuyaClient();

module.exports = client;
