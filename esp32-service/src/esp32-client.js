const axios = require('axios');

class ESP32Client {
  constructor() {
    this.devices = new Map();
    this.timeout = parseInt(process.env.HTTP_TIMEOUT) || 5000;
  }

  async initialize() {
    console.log('[ESP32] Inicializando cliente...');
    
    // Parsear dispositivos desde variable de entorno
    const devicesEnv = process.env.ESP32_DEVICES || '';
    
    if (!devicesEnv) {
      console.warn('[ESP32] No hay dispositivos configurados en ESP32_DEVICES');
      return;
    }

    // Formato: nombre=ip:puerto,nombre2=ip2:puerto2
    const deviceEntries = devicesEnv.split(',').filter(Boolean);
    
    for (const entry of deviceEntries) {
      const [name, address] = entry.split('=');
      if (name && address) {
        const [ip, port = '80'] = address.split(':');
        this.devices.set(name.trim(), {
          name: name.trim(),
          ip: ip.trim(),
          port: parseInt(port),
          baseUrl: `http://${ip.trim()}:${port}`,
          online: false,
          lastSeen: null,
        });
        console.log(`[ESP32] Dispositivo registrado: ${name} -> ${ip}:${port}`);
      }
    }

    // Verificar conectividad inicial
    await this.checkAllDevices();
    
    console.log(`[ESP32] Cliente inicializado con ${this.devices.size} dispositivo(s)`);
  }

  async checkAllDevices() {
    for (const [name, device] of this.devices) {
      try {
        const response = await axios.get(`${device.baseUrl}/status`, {
          timeout: this.timeout,
        });
        device.online = true;
        device.lastSeen = new Date();
        console.log(`[ESP32] ${name}: Online`);
      } catch (error) {
        device.online = false;
        console.log(`[ESP32] ${name}: Offline - ${error.message}`);
      }
    }
  }

  getDevices() {
    return Array.from(this.devices.values()).map(device => ({
      id: device.name,
      name: device.name,
      ip: device.ip,
      port: device.port,
      online: device.online,
      lastSeen: device.lastSeen,
      type: 'esp32-relay-dht11',
    }));
  }

  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  async getDeviceStatus(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Dispositivo '${deviceId}' no encontrado`);
    }

    try {
      const response = await axios.get(`${device.baseUrl}/status`, {
        timeout: this.timeout,
      });
      
      device.online = true;
      device.lastSeen = new Date();
      
      return {
        deviceId,
        online: true,
        ...response.data,
      };
    } catch (error) {
      device.online = false;
      throw new Error(`No se pudo conectar con ${deviceId}: ${error.message}`);
    }
  }

  async getSensors(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Dispositivo '${deviceId}' no encontrado`);
    }

    try {
      const response = await axios.get(`${device.baseUrl}/sensors`, {
        timeout: this.timeout,
      });
      
      device.online = true;
      device.lastSeen = new Date();
      
      return {
        deviceId,
        timestamp: new Date().toISOString(),
        ...response.data,
      };
    } catch (error) {
      device.online = false;
      throw new Error(`No se pudo leer sensores de ${deviceId}: ${error.message}`);
    }
  }

  async setRelayPower(deviceId, relayId, state) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Dispositivo '${deviceId}' no encontrado`);
    }

    try {
      const response = await axios.post(
        `${device.baseUrl}/relay/${relayId}`,
        { state: state ? 'on' : 'off' },
        { timeout: this.timeout }
      );
      
      device.online = true;
      device.lastSeen = new Date();
      
      return {
        deviceId,
        relayId: parseInt(relayId),
        state: response.data.state,
        success: true,
      };
    } catch (error) {
      device.online = false;
      throw new Error(`No se pudo controlar relay ${relayId} de ${deviceId}: ${error.message}`);
    }
  }

  async toggleRelay(deviceId, relayId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Dispositivo '${deviceId}' no encontrado`);
    }

    try {
      const response = await axios.post(
        `${device.baseUrl}/relay/${relayId}/toggle`,
        {},
        { timeout: this.timeout }
      );
      
      device.online = true;
      device.lastSeen = new Date();
      
      return {
        deviceId,
        relayId: parseInt(relayId),
        state: response.data.state,
        success: true,
      };
    } catch (error) {
      device.online = false;
      throw new Error(`No se pudo toggle relay ${relayId} de ${deviceId}: ${error.message}`);
    }
  }
}

module.exports = new ESP32Client();
