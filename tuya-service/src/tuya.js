const { TuyaContext } = require('@tuya/tuya-connector-nodejs');

class TuyaClient {
  constructor() {
    this.context = null;
    this.devices = [];
    // Sistema de caché para reducir llamadas a la API
    this.cache = new Map();
    this.cacheExpiryMs = parseInt(process.env.TUYA_CACHE_TTL_MS, 10) || 60000; // 60 segundos por defecto
    this.lastKnownValues = new Map(); // Fallback cuando la cuota se agota
    this.quotaExceeded = false;
    this.quotaResetTime = null;
  }

  /**
   * Verifica si hay un valor en caché válido
   */
  getCachedValue(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[Tuya] Cache hit para: ${key}`);
      return cached.value;
    }
    return null;
  }

  /**
   * Almacena un valor en caché
   */
  setCachedValue(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheExpiryMs,
    });
    // También guardar como último valor conocido
    this.lastKnownValues.set(key, {
      value,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Obtiene el último valor conocido (para cuando la cuota se agota)
   */
  getLastKnownValue(key) {
    const lastKnown = this.lastKnownValues.get(key);
    if (lastKnown) {
      console.log(`[Tuya] Usando último valor conocido para: ${key} (de ${lastKnown.timestamp})`);
      return {
        ...lastKnown.value,
        _fromCache: true,
        _cachedAt: lastKnown.timestamp,
        _warning: 'Datos en caché - cuota de API agotada',
      };
    }
    return null;
  }

  /**
   * Verifica si el error es por cuota excedida
   */
  isQuotaExceededError(errorMsg) {
    return errorMsg && (
      errorMsg.includes('quota') ||
      errorMsg.includes('Trial Edition') ||
      errorMsg.includes('upgrade to the official version')
    );
  }

  /**
   * Marca que la cuota fue excedida
   */
  markQuotaExceeded() {
    this.quotaExceeded = true;
    // Intentar resetear después de 1 hora
    this.quotaResetTime = Date.now() + (60 * 60 * 1000);
    console.warn('[Tuya] ⚠️ Cuota de API excedida. Usando caché para las próximas solicitudes.');
  }

  /**
   * Verifica si debemos intentar llamar a la API nuevamente
   */
  shouldTryApi() {
    if (!this.quotaExceeded) return true;
    if (Date.now() > this.quotaResetTime) {
      console.log('[Tuya] Intentando resetear estado de cuota...');
      this.quotaExceeded = false;
      return true;
    }
    return false;
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
        // Verificar si es error de cuota
        if (this.isQuotaExceededError(response.msg)) {
          this.markQuotaExceeded();
          throw new Error(`Cuota excedida: ${response.msg}`);
        }

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
          // Verificar si es error de cuota en respuesta alternativa
          if (this.isQuotaExceededError(altResponse.msg)) {
            this.markQuotaExceeded();
            throw new Error(`Cuota excedida: ${altResponse.msg}`);
          }
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
    const cacheKey = 'devices_list';

    // Verificar caché primero
    const cachedValue = this.getCachedValue(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }

    // Si la cuota está excedida, usar último valor conocido
    if (!this.shouldTryApi()) {
      const lastKnown = this.getLastKnownValue(cacheKey);
      if (lastKnown) {
        return lastKnown;
      }
      console.warn('[Tuya] Cuota excedida y no hay lista de dispositivos en caché');
      return [];
    }

    try {
      await this.refreshDevices();
      const result = this.devices.map(d => ({
        id: d.id,
        name: d.name || d.device_name,
        category: d.category,
        brand: 'Tuya',
        model: d.product_name,
        online: d.online,
        ip: d.ip,
      }));

      // Guardar en caché (con TTL más largo para lista de dispositivos: 5 minutos)
      this.cache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutos
      });
      this.lastKnownValues.set(cacheKey, {
        value: result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      if (this.isQuotaExceededError(error.message)) {
        this.markQuotaExceeded();
        const lastKnown = this.getLastKnownValue(cacheKey);
        if (lastKnown) {
          return lastKnown;
        }
      }
      throw error;
    }
  }

  async getDeviceStatus(deviceId) {
    if (!deviceId) {
      throw new Error('deviceId es requerido');
    }

    const cacheKey = `status_${deviceId}`;

    // Verificar caché primero
    const cachedValue = this.getCachedValue(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }

    // Si la cuota está excedida, usar último valor conocido
    if (!this.shouldTryApi()) {
      const lastKnown = this.getLastKnownValue(cacheKey);
      if (lastKnown) {
        return lastKnown;
      }
      throw new Error('Cuota de API excedida y no hay datos en caché disponibles');
    }

    console.log(`[Tuya] Obteniendo estado del dispositivo: ${deviceId}`);

    try {
      const response = await this.context.request({
        method: 'GET',
        path: `/v1.0/iot-03/devices/${deviceId}/status`,
      });

      if (!response.success) {
        // Verificar si es error de cuota
        if (this.isQuotaExceededError(response.msg)) {
          this.markQuotaExceeded();
          const lastKnown = this.getLastKnownValue(cacheKey);
          if (lastKnown) {
            return lastKnown;
          }
        }
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

      const result = {
        deviceId,
        name: deviceInfo.name,
        category: deviceInfo.category,
        online: deviceInfo.online,
        status: statusObj,
        rawStatus: status,
      };

      // Guardar en caché
      this.setCachedValue(cacheKey, result);

      return result;
    } catch (error) {
      // Si falla por cuota, intentar devolver último valor conocido
      if (this.isQuotaExceededError(error.message)) {
        this.markQuotaExceeded();
        const lastKnown = this.getLastKnownValue(cacheKey);
        if (lastKnown) {
          return lastKnown;
        }
      }
      throw error;
    }
  }

  async setPowerState(deviceId, state) {
    if (!deviceId) {
      throw new Error('deviceId es requerido');
    }

    if (!['on', 'off'].includes(state)) {
      throw new Error('Estado inválido. Usar "on" o "off"');
    }

    // Verificar si la cuota está excedida antes de intentar
    if (!this.shouldTryApi()) {
      throw new Error('Cuota de API de Tuya excedida. No se puede controlar el dispositivo. Intenta más tarde o actualiza el plan en Tuya IoT Platform.');
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
      // Verificar si es error de cuota
      if (this.isQuotaExceededError(response.msg)) {
        this.markQuotaExceeded();
        throw new Error('Cuota de API de Tuya excedida. No se puede controlar el dispositivo. Intenta más tarde o actualiza el plan en Tuya IoT Platform.');
      }

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
        if (this.isQuotaExceededError(altResponse.msg)) {
          this.markQuotaExceeded();
          throw new Error('Cuota de API de Tuya excedida. No se puede controlar el dispositivo. Intenta más tarde o actualiza el plan en Tuya IoT Platform.');
        }
        throw new Error(`Error al cambiar estado: ${response.msg}`);
      }
    }

    // Invalidar caché del dispositivo para que la próxima lectura sea fresca
    this.cache.delete(`status_${deviceId}`);
    this.cache.delete(`co2_${deviceId}`);

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

    const cacheKey = `co2_${deviceId}`;

    // Verificar caché primero
    const cachedValue = this.getCachedValue(cacheKey);
    if (cachedValue) {
      return cachedValue;
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

    const result = {
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
      // Propagar información de caché si viene del getDeviceStatus
      ...(status._fromCache && {
        _fromCache: status._fromCache,
        _cachedAt: status._cachedAt,
        _warning: status._warning,
      }),
    };

    // Solo guardar en caché si no viene de caché
    if (!status._fromCache) {
      this.setCachedValue(cacheKey, result);
    }

    return result;
  }

  /**
   * Obtiene información del estado del caché y cuota
   */
  getCacheStatus() {
    return {
      quotaExceeded: this.quotaExceeded,
      quotaResetTime: this.quotaResetTime ? new Date(this.quotaResetTime).toISOString() : null,
      cacheEntries: this.cache.size,
      lastKnownEntries: this.lastKnownValues.size,
      cacheTtlMs: this.cacheExpiryMs,
    };
  }

  /**
   * Limpia el caché manualmente
   */
  clearCache() {
    this.cache.clear();
    console.log('[Tuya] Caché limpiado');
  }

  /**
   * Resetea el estado de cuota manualmente
   */
  resetQuotaStatus() {
    this.quotaExceeded = false;
    this.quotaResetTime = null;
    console.log('[Tuya] Estado de cuota reseteado');
  }
}

// Singleton
const client = new TuyaClient();

module.exports = client;
