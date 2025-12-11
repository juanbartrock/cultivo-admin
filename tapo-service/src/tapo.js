const { cloudLogin } = require('tp-link-tapo-connect');
const path = require('path');
const fs = require('fs');

class TapoClient {
  constructor() {
    this.cloud = null; // Objeto con funciones de cloud
    this.devices = [];
    this.cameraDevice = null;
    this.snapshotsDir = path.join(__dirname, '..', 'snapshots');
    this.email = null;
    this.password = null;
  }

  async initialize() {
    this.email = process.env.TAPO_EMAIL || process.env.TAPO_USERNAME;
    this.password = process.env.TAPO_PASSWORD;

    if (!this.email || !this.password) {
      throw new Error('TAPO_EMAIL y TAPO_PASSWORD son requeridos para conectar via cloud');
    }

    // Crear directorio de snapshots si no existe
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }

    console.log(`[Tapo Cloud] Conectando con cuenta: ${this.email}...`);

    try {
      // Login en la nube de TP-Link - devuelve objeto con funciones
      this.cloud = await cloudLogin(this.email, this.password);
      console.log('[Tapo Cloud] Autenticación exitosa');

      // Obtener cámaras
      await this.refreshDevices();

      console.log('[Tapo Cloud] Conexión establecida correctamente');
    } catch (error) {
      console.error('[Tapo Cloud] Error de conexión:', error.message);
      throw error;
    }
  }

  async refreshDevices() {
    console.log('[Tapo Cloud] Obteniendo dispositivos...');

    try {
      // Usar el método del objeto cloud para obtener dispositivos
      const allDevices = await this.cloud.listDevices();
      
      // Filtrar SOLO cámaras (SMART.IPCAMERA)
      this.devices = allDevices.filter(d => d.deviceType === 'SMART.IPCAMERA');
      
      console.log(`[Tapo Cloud] ${allDevices.length} dispositivo(s) total, ${this.devices.length} cámara(s)`);

      // Mostrar todos los dispositivos encontrados
      allDevices.forEach((device, i) => {
        const isCam = this.devices.includes(device) ? '📷' : '🔌';
        console.log(`  ${isCam} ${i + 1}. ${device.alias || device.deviceName} (${device.deviceType || 'unknown'})`);
      });

      if (this.devices.length > 0) {
        // Usar la primera cámara por defecto, o buscar por nombre si está configurado
        const cameraName = process.env.TAPO_CAMERA_NAME;
        if (cameraName) {
          this.cameraDevice = this.devices.find(d => 
            (d.alias || d.deviceName || '').toLowerCase().includes(cameraName.toLowerCase())
          );
        }

        if (!this.cameraDevice) {
          this.cameraDevice = this.devices[0];
        }

        console.log(`[Tapo Cloud] Cámara seleccionada: ${this.cameraDevice.alias || this.cameraDevice.deviceName}`);
      } else {
        console.log('[Tapo Cloud] No se encontraron cámaras en la cuenta');
      }

      return this.devices;
    } catch (error) {
      console.error('[Tapo Cloud] Error obteniendo dispositivos:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene información de la cámara conectada via cloud
   */
  getCameraInfo() {
    if (!this.cameraDevice) {
      return {
        connected: false,
        message: 'No hay cámara configurada',
      };
    }

    return {
      connected: true,
      deviceId: this.cameraDevice.deviceId,
      name: this.cameraDevice.alias || this.cameraDevice.deviceName,
      model: this.cameraDevice.deviceModel,
      type: this.cameraDevice.deviceType,
      mac: this.cameraDevice.deviceMac,
      firmware: this.cameraDevice.fwVer,
      connectionType: 'cloud',
      snapshotsDir: this.snapshotsDir,
    };
  }

  /**
   * Captura un snapshot de la cámara
   * Intenta via Cloud API primero, luego fallback a RTSP
   * @returns {Promise<object>} Información del snapshot
   */
  async captureSnapshot() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot-${timestamp}.jpg`;
    const filepath = path.join(this.snapshotsDir, filename);

    // Intentar obtener snapshot via TapoCare (si está disponible)
    if (this.cameraDevice && this.cloud.tapoCareCloudVideos) {
      try {
        console.log(`[Tapo Cloud] Intentando obtener snapshot via TapoCare...`);
        const videos = await this.cloud.tapoCareCloudVideos(this.cameraDevice.deviceId);
        if (videos && videos.data && videos.data.length > 0) {
          // Usar el thumbnail del video más reciente como snapshot
          const latestVideo = videos.data[0];
          if (latestVideo.thumbnailUrl) {
            const axios = require('axios');
            const response = await axios.get(latestVideo.thumbnailUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(filepath, response.data);
            const stats = fs.statSync(filepath);
            console.log(`[Tapo Cloud] Snapshot guardado: ${filename} (${stats.size} bytes)`);
            return {
              success: true,
              filename,
              filepath,
              size: stats.size,
              timestamp: new Date().toISOString(),
              source: 'tapocare',
            };
          }
        }
      } catch (error) {
        console.log(`[Tapo Cloud] TapoCare no disponible: ${error.message}`);
      }
    }

    // Fallback: Captura via RTSP (requiere IP local)
    const localIp = process.env.TAPO_CAMERA_IP;
    if (localIp) {
      console.log('[Tapo] Intentando captura via RTSP local...');
      return this.captureSnapshotRTSP(localIp, filename, filepath);
    }

    throw new Error('No se pudo capturar snapshot. Configure TAPO_CAMERA_IP para usar RTSP.');
  }

  /**
   * Captura via RTSP (requiere estar en la misma red o IP accesible)
   */
  async captureSnapshotRTSP(cameraIp, filename, filepath) {
    const { spawn } = require('child_process');
    
    const username = process.env.TAPO_CAMERA_USER || process.env.TAPO_USERNAME || 'admin';
    const password = process.env.TAPO_CAMERA_PASS || process.env.TAPO_PASSWORD;
    const rtspUrl = `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cameraIp}:554/stream1`;

    console.log(`[Tapo RTSP] Capturando via ${cameraIp}...`);

    return new Promise((resolve, reject) => {
      const args = [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-frames:v', '1',
        '-q:v', '2',
        '-y',
        filepath,
      ];

      const ffmpeg = spawn('ffmpeg', args, { timeout: 30000 });
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(filepath)) {
          const stats = fs.statSync(filepath);
          console.log(`[Tapo RTSP] Snapshot guardado: ${filename} (${stats.size} bytes)`);
          
          resolve({
            success: true,
            filename,
            filepath,
            size: stats.size,
            timestamp: new Date().toISOString(),
            source: 'rtsp',
          });
        } else {
          reject(new Error(`Error al capturar snapshot via RTSP: código ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`ffmpeg no disponible: ${err.message}`));
      });
    });
  }

  /**
   * Obtiene URLs del stream RTSP (si se conoce la IP local)
   */
  getStreamUrls(quality = 'high') {
    const localIp = process.env.TAPO_CAMERA_IP;
    
    if (!localIp) {
      return {
        available: false,
        message: 'IP local no configurada. Los streams RTSP requieren conexión local.',
        tip: 'Configure TAPO_CAMERA_IP si desea acceder al stream desde la red local.',
      };
    }

    const stream = quality === 'low' ? 'stream2' : 'stream1';
    const username = process.env.TAPO_CAMERA_USER || process.env.TAPO_USERNAME || 'admin';
    const password = process.env.TAPO_CAMERA_PASS || process.env.TAPO_PASSWORD;

    return {
      available: true,
      quality,
      stream,
      url: `rtsp://${localIp}:554/${stream}`,
      authenticatedUrl: `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${localIp}:554/${stream}`,
      requiresLocalNetwork: true,
    };
  }

  /**
   * Lista los snapshots guardados
   */
  listSnapshots() {
    if (!fs.existsSync(this.snapshotsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.snapshotsDir)
      .filter(f => f.endsWith('.jpg'))
      .map(filename => {
        const filepath = path.join(this.snapshotsDir, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  }

  /**
   * Obtiene la ruta de un snapshot específico
   */
  getSnapshotPath(filename) {
    const filepath = path.join(this.snapshotsDir, filename);
    if (fs.existsSync(filepath)) {
      return filepath;
    }
    return null;
  }

  /**
   * Elimina snapshots antiguos (mantiene los últimos N)
   */
  cleanupSnapshots(keepCount = 10) {
    const snapshots = this.listSnapshots();
    const toDelete = snapshots.slice(keepCount);

    toDelete.forEach(snapshot => {
      const filepath = path.join(this.snapshotsDir, snapshot.filename);
      fs.unlinkSync(filepath);
      console.log(`[Tapo Cloud] Eliminado snapshot antiguo: ${snapshot.filename}`);
    });

    return {
      deleted: toDelete.length,
      remaining: Math.min(snapshots.length, keepCount),
    };
  }

  /**
   * Obtiene todos los dispositivos Tapo de la cuenta
   */
  async getDevices() {
    if (!this.cloud) {
      return [];
    }
    
    try {
      const allDevices = await this.cloud.listDevices();
      return allDevices.map(d => ({
        id: d.deviceId,
        name: d.alias || d.deviceName,
        model: d.deviceModel,
        type: d.deviceType,
        mac: d.deviceMac,
        online: true,
        brand: 'TP-Link Tapo',
      }));
    } catch (error) {
      console.error('[Tapo Cloud] Error listando dispositivos:', error.message);
      return [];
    }
  }
}

// Singleton
const client = new TapoClient();

module.exports = client;
