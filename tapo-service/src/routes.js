const express = require('express');
const path = require('path');
const tapoClient = require('./tapo');

const router = express.Router();

/**
 * GET /health
 * Health check del servicio
 */
router.get('/health', (req, res) => {
  const cameraInfo = tapoClient.getCameraInfo();
  res.json({
    status: 'ok',
    service: 'tapo-service',
    version: '2.0.0',
    connectionType: 'cloud',
    cameraConnected: cameraInfo.connected,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /devices
 * Lista los dispositivos Tapo (cámaras) de la cuenta
 * Este endpoint es requerido por el backend para escanear dispositivos
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await tapoClient.getDevices();
    
    res.json({
      success: true,
      count: devices.length,
      devices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /camera
 * Información de la cámara configurada
 */
router.get('/camera', (req, res) => {
  try {
    const info = tapoClient.getCameraInfo();
    res.json({
      success: true,
      ...info,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /stream
 * Obtiene las URLs del stream RTSP (requiere IP local configurada)
 */
router.get('/stream', (req, res) => {
  try {
    const quality = req.query.quality || 'high';
    
    if (!['high', 'low'].includes(quality)) {
      return res.status(400).json({
        success: false,
        error: 'Quality debe ser "high" o "low"',
      });
    }

    const streamInfo = tapoClient.getStreamUrls(quality);
    
    res.json({
      success: true,
      ...streamInfo,
      note: 'Los streams RTSP solo funcionan si está en la misma red que la cámara',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /snapshot
 * Captura un snapshot via Cloud API
 */
router.post('/snapshot', async (req, res) => {
  try {
    const snapshot = await tapoClient.captureSnapshot();
    
    res.json({
      success: true,
      ...snapshot,
      downloadUrl: `/snapshots/${snapshot.filename}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /snapshots
 * Lista los snapshots guardados
 */
router.get('/snapshots', (req, res) => {
  try {
    const snapshots = tapoClient.listSnapshots();
    res.json({
      success: true,
      count: snapshots.length,
      snapshots: snapshots.map(s => ({
        ...s,
        downloadUrl: `/snapshots/${s.filename}`,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /snapshots/:filename
 * Descarga un snapshot específico
 */
router.get('/snapshots/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validar que el filename sea seguro
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de archivo inválido',
      });
    }

    const filepath = tapoClient.getSnapshotPath(filename);
    
    if (!filepath) {
      return res.status(404).json({
        success: false,
        error: 'Snapshot no encontrado',
      });
    }

    res.sendFile(filepath);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /snapshots
 * Limpia snapshots antiguos
 */
router.delete('/snapshots', (req, res) => {
  try {
    const keepCount = parseInt(req.query.keep) || 10;
    const result = tapoClient.cleanupSnapshots(keepCount);
    
    res.json({
      success: true,
      message: `Eliminados ${result.deleted} snapshots, quedan ${result.remaining}`,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
