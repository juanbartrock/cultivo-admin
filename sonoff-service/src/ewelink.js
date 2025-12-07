const crypto = require('crypto');
const https = require('https');
const WebSocket = require('ws');

class EwelinkClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.apiKey = null;
    this.region = 'us';
    this.devices = [];
    this.targetDevice = null;
    this.ws = null;
    this.wsConnected = false;
    this.sequence = 0;
    
    // AppID de eWeLink (del fork baugp/ewelink-api)
    this.appId = '4s1FXKC9FaGfoqXhmXSJneb3qcm1gOak';
    this.appSecret = 'oKvCM06gvwkRbfetd6qWRrbC3rFrbIpV';
  }

  getHost() {
    const hosts = {
      'us': 'us-apia.coolkit.cc',
      'eu': 'eu-apia.coolkit.cc',
      'cn': 'cn-apia.coolkit.cn',
      'as': 'as-apia.coolkit.cc'
    };
    return hosts[this.region] || hosts['us'];
  }

  getWsHost() {
    const hosts = {
      'us': 'us-pconnect3.coolkit.cc',
      'eu': 'eu-pconnect3.coolkit.cc',
      'cn': 'cn-pconnect3.coolkit.cn',
      'as': 'as-pconnect3.coolkit.cc'
    };
    return hosts[this.region] || hosts['us'];
  }

  makeSign(message) {
    return crypto
      .createHmac('sha256', this.appSecret)
      .update(message)
      .digest('base64');
  }

  getNonce() {
    return crypto.randomBytes(4).toString('hex');
  }

  getTimestamp() {
    return Math.floor(Date.now() / 1000);
  }

  async httpRequest(method, path, body = null, useToken = true) {
    return new Promise((resolve, reject) => {
      const nonce = this.getNonce();
      const headers = {
        'Content-Type': 'application/json',
        'X-CK-Appid': this.appId,
        'X-CK-Nonce': nonce,
      };

      if (useToken && this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      } else if (!useToken && body) {
        const sign = this.makeSign(JSON.stringify(body));
        headers['Authorization'] = `Sign ${sign}`;
      }

      const options = {
        hostname: this.getHost(),
        port: 443,
        path: path,
        method: method,
        headers: headers,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Error parsing response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async initialize() {
    const email = process.env.EWELINK_EMAIL;
    const password = process.env.EWELINK_PASSWORD;
    this.region = process.env.EWELINK_REGION || 'us';

    if (!email || !password) {
      throw new Error('EWELINK_EMAIL y EWELINK_PASSWORD son requeridos');
    }

    console.log(`[eWeLink] Conectando con región: ${this.region}...`);

    // Paso 1: Login para obtener token
    await this.login(email, password);

    // Paso 2: Obtener dispositivos
    await this.refreshDevices();

    // Paso 3: Encontrar dispositivo objetivo
    await this.findTargetDevice();

    // Paso 4: Conectar WebSocket para control
    await this.connectWebSocket();

    console.log('[eWeLink] Conexión establecida correctamente');
  }

  async login(email, password) {
    console.log('[eWeLink] Iniciando sesión...');
    
    const body = {
      email: email,
      password: password,
      countryCode: '+54',
    };

    const response = await this.httpRequest('POST', '/v2/user/login', body, false);

    if (response.error !== 0) {
      throw new Error(`Error de autenticación: ${response.msg || response.error}`);
    }

    this.accessToken = response.data.at;
    this.refreshToken = response.data.rt;
    this.apiKey = response.data.user.apikey;
    this.region = response.data.region || this.region;
    
    console.log('[eWeLink] Autenticación exitosa');
    console.log(`[eWeLink] Región: ${this.region}, ApiKey: ${this.apiKey.substring(0, 8)}...`);
  }

  async refreshDevices() {
    console.log('[eWeLink] Obteniendo dispositivos...');
    
    const response = await this.httpRequest('GET', '/v2/device/thing');

    if (response.error !== 0) {
      throw new Error(`Error obteniendo dispositivos: ${response.msg || response.error}`);
    }

    const thingList = response.data.thingList || [];
    this.devices = thingList
      .filter(thing => thing.itemType === 1)
      .map(thing => thing.itemData);

    console.log(`[eWeLink] ${this.devices.length} dispositivo(s) encontrado(s)`);

    if (this.devices.length > 0) {
      const first = this.devices[0];
      console.log(`[eWeLink] Primer dispositivo: ${first.name} (${first.deviceid})`);
    }

    return this.devices;
  }

  async findTargetDevice() {
    const deviceName = process.env.DEVICE_NAME;

    if (this.devices.length === 0) {
      throw new Error('No hay dispositivos en la cuenta eWeLink');
    }

    if (deviceName) {
      this.targetDevice = this.devices.find(d =>
        d.name && d.name.toLowerCase().includes(deviceName.toLowerCase())
      );

      if (!this.targetDevice) {
        console.warn(`[eWeLink] Dispositivo "${deviceName}" no encontrado.`);
        this.devices.forEach(d => console.log(`  - ${d.name} (${d.deviceid})`));
        throw new Error(`Dispositivo "${deviceName}" no encontrado`);
      }
    } else {
      this.targetDevice = this.devices[0];
      console.log(`[eWeLink] Usando primer dispositivo: ${this.targetDevice.name}`);
    }

    console.log(`[eWeLink] Dispositivo objetivo: ${this.targetDevice.name} (${this.targetDevice.deviceid})`);
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log('[eWeLink] Conectando WebSocket...');
      
      const wsUrl = `wss://${this.getWsHost()}:8080/api/ws`;
      this.ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.ws.on('open', () => {
        console.log('[eWeLink] WebSocket conectado, autenticando...');
        
        // Enviar handshake
        const handshake = {
          action: 'userOnline',
          at: this.accessToken,
          apikey: this.apiKey,
          appid: this.appId,
          nonce: this.getNonce(),
          ts: this.getTimestamp(),
          userAgent: 'app',
          sequence: String(Date.now()),
          version: 8,
        };
        
        this.ws.send(JSON.stringify(handshake));
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          
          if (msg.error === 0 && msg.config) {
            clearTimeout(timeout);
            this.wsConnected = true;
            console.log('[eWeLink] WebSocket autenticado');
            resolve();
          } else if (msg.error !== undefined && msg.error !== 0) {
            console.error('[eWeLink] Error WebSocket:', msg);
          }
        } catch (e) {
          console.error('[eWeLink] Error parsing WS message:', e);
        }
      });

      this.ws.on('error', (err) => {
        clearTimeout(timeout);
        console.error('[eWeLink] WebSocket error:', err.message);
        reject(err);
      });

      this.ws.on('close', () => {
        this.wsConnected = false;
        console.log('[eWeLink] WebSocket desconectado');
      });
    });
  }

  async sendWsMessage(payload) {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.wsConnected) {
        reject(new Error('WebSocket no conectado'));
        return;
      }

      const sequence = String(Date.now());
      const message = {
        ...payload,
        sequence,
      };

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket response timeout'));
      }, 10000);

      const handler = (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.sequence === sequence) {
            clearTimeout(timeout);
            this.ws.off('message', handler);
            resolve(msg);
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
      };

      this.ws.on('message', handler);
      this.ws.send(JSON.stringify(message));
    });
  }

  async getDevices() {
    await this.refreshDevices();
    return this.devices.map(d => ({
      id: d.deviceid,
      name: d.name,
      brand: d.brandName || 'SONOFF',
      model: d.productModel,
      online: d.online,
    }));
  }

  async getDeviceStatus() {
    if (!this.targetDevice) {
      throw new Error('No hay dispositivo objetivo configurado');
    }

    // Refrescar dispositivos para datos actualizados
    await this.refreshDevices();
    
    const device = this.devices.find(d => d.deviceid === this.targetDevice.deviceid);
    if (!device) {
      throw new Error('Dispositivo no encontrado');
    }

    const params = device.params || {};

    return {
      deviceId: device.deviceid,
      name: device.name,
      online: device.online,
      switch: params.switch || 'unknown',
      temperature: params.currentTemperature ?? params.temperature ?? null,
      humidity: params.currentHumidity ?? params.humidity ?? null,
      unit: params.tempUnit === 1 ? 'fahrenheit' : 'celsius',
    };
  }

  async setPowerState(state) {
    if (!this.targetDevice) {
      throw new Error('No hay dispositivo objetivo configurado');
    }

    if (!['on', 'off'].includes(state)) {
      throw new Error('Estado inválido. Usar "on" o "off"');
    }

    console.log(`[eWeLink] Cambiando estado a: ${state}`);

    // Reconectar WebSocket si es necesario
    if (!this.wsConnected) {
      await this.connectWebSocket();
    }

    const payload = {
      action: 'update',
      apikey: this.targetDevice.apikey || this.apiKey,
      deviceid: this.targetDevice.deviceid,
      params: {
        switch: state,
      },
      userAgent: 'app',
      nonce: this.getNonce(),
      ts: this.getTimestamp(),
    };

    const response = await this.sendWsMessage(payload);
    
    if (response.error !== 0) {
      throw new Error(`Error al cambiar estado: ${response.error}`);
    }

    return {
      success: true,
      deviceId: this.targetDevice.deviceid,
      state: state,
      message: `Dispositivo ${state === 'on' ? 'encendido' : 'apagado'} correctamente`,
    };
  }

  async togglePower() {
    const status = await this.getDeviceStatus();
    const newState = status.switch === 'on' ? 'off' : 'on';
    return await this.setPowerState(newState);
  }
}

// Singleton
const client = new EwelinkClient();

module.exports = client;
