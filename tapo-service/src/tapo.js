const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TapoClient {
  constructor() {
    this.cameraIp = null;
    this.username = null;
    this.password = null;
    this.snapshotsDir = path.join(__dirname, '..', 'snapshots');
  }

  initialize() {
    this.cameraIp = process.env.TAPO_CAMERA_IP;
    this.username = process.env.TAPO_USERNAME;
    this.password = process.env.TAPO_PASSWORD;

    if (!this.cameraIp) {
      throw new Error('TAPO_CAMERA_IP es requerido');
    }

    if (!this.username || !this.password) {
      console.warn('[Tapo] TAPO_USERNAME y TAPO_PASSWORD no configurados');
      console.warn('[Tapo] Los streams RTSP pueden requerir autenticación');
    }

    // Crear directorio de snapshots si no existe
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }

    console.log(`[Tapo] Configurado para cámara: ${this.cameraIp}`);
    console.log(`[Tapo] Directorio de snapshots: ${this.snapshotsDir}`);
  }

  /**
   * Genera la URL RTSP para el stream
   * @param {string} quality - 'high' o 'low'
   * @returns {object} URLs con y sin credenciales
   */
  getStreamUrls(quality = 'high') {
    const stream = quality === 'low' ? 'stream2' : 'stream1';
    const port = 554;

    // URL sin credenciales (para mostrar)
    const publicUrl = `rtsp://${this.cameraIp}:${port}/${stream}`;

    // URL con credenciales (para uso interno)
    let authenticatedUrl = publicUrl;
    if (this.username && this.password) {
      const encodedUser = encodeURIComponent(this.username);
      const encodedPass = encodeURIComponent(this.password);
      authenticatedUrl = `rtsp://${encodedUser}:${encodedPass}@${this.cameraIp}:${port}/${stream}`;
    }

    return {
      quality,
      stream,
      url: publicUrl,
      authenticatedUrl,
      requiresAuth: !!(this.username && this.password),
    };
  }

  /**
   * Captura un snapshot del stream RTSP usando ffmpeg
   * @param {string} quality - 'high' o 'low'
   * @returns {Promise<object>} Información del snapshot
   */
  async captureSnapshot(quality = 'high') {
    const streamInfo = this.getStreamUrls(quality);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot-${timestamp}.jpg`;
    const filepath = path.join(this.snapshotsDir, filename);

    console.log(`[Tapo] Capturando snapshot de ${streamInfo.stream}...`);

    return new Promise((resolve, reject) => {
      // Usar ffmpeg para capturar un frame del stream RTSP
      const args = [
        '-rtsp_transport', 'tcp',
        '-i', streamInfo.authenticatedUrl,
        '-frames:v', '1',
        '-q:v', '2',
        '-y',
        filepath,
      ];

      const ffmpeg = spawn('ffmpeg', args, {
        timeout: 30000,
      });

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(filepath)) {
          const stats = fs.statSync(filepath);
          console.log(`[Tapo] Snapshot guardado: ${filename} (${stats.size} bytes)`);
          
          resolve({
            success: true,
            filename,
            filepath,
            size: stats.size,
            quality,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.error(`[Tapo] Error capturando snapshot: ${stderr}`);
          reject(new Error(`Error al capturar snapshot: código ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        console.error(`[Tapo] Error ejecutando ffmpeg: ${err.message}`);
        reject(new Error(`ffmpeg no disponible: ${err.message}`));
      });
    });
  }

  /**
   * Obtiene información de la cámara
   */
  getCameraInfo() {
    return {
      ip: this.cameraIp,
      model: 'TP-Link Tapo C100',
      streams: {
        high: this.getStreamUrls('high'),
        low: this.getStreamUrls('low'),
      },
      snapshotsDir: this.snapshotsDir,
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
      console.log(`[Tapo] Eliminado snapshot antiguo: ${snapshot.filename}`);
    });

    return {
      deleted: toDelete.length,
      remaining: Math.min(snapshots.length, keepCount),
    };
  }
}

// Singleton
const client = new TapoClient();

module.exports = client;
