const express = require('express');
const tuyaClient = require('./tuya');

const router = express.Router();

/**
 * GET /health
 * Health check del servicio
 */
router.get('/health', (req, res) => {
  const cacheStatus = tuyaClient.getCacheStatus();
  res.json({
    status: 'ok',
    service: 'tuya-service',
    timestamp: new Date().toISOString(),
    cache: cacheStatus,
  });
});

/**
 * GET /cache/status
 * Obtiene el estado del caché y la cuota de API
 */
router.get('/cache/status', (req, res) => {
  const cacheStatus = tuyaClient.getCacheStatus();
  res.json({
    success: true,
    ...cacheStatus,
  });
});

/**
 * POST /cache/clear
 * Limpia el caché de dispositivos
 */
router.post('/cache/clear', (req, res) => {
  tuyaClient.clearCache();
  res.json({
    success: true,
    message: 'Caché limpiado correctamente',
  });
});

/**
 * POST /cache/reset-quota
 * Resetea el estado de cuota excedida (para intentar nuevamente)
 */
router.post('/cache/reset-quota', (req, res) => {
  tuyaClient.resetQuotaStatus();
  res.json({
    success: true,
    message: 'Estado de cuota reseteado. Las próximas llamadas intentarán usar la API.',
  });
});

/**
 * GET /devices
 * Lista todos los dispositivos de la cuenta Tuya
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await tuyaClient.getDevices();
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
 * GET /device/:id/status
 * Obtiene el estado completo de un dispositivo
 */
router.get('/device/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const status = await tuyaClient.getDeviceStatus(id);
    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /device/:id/power
 * Cambia el estado de encendido/apagado de un enchufe
 * Body: { "state": "on" } o { "state": "off" }
 */
router.post('/device/:id/power', async (req, res) => {
  try {
    const { id } = req.params;
    const { state } = req.body;

    if (!state) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el campo "state" en el body (on/off)',
      });
    }

    if (!['on', 'off'].includes(state.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido. Valores permitidos: "on" o "off"',
      });
    }

    const result = await tuyaClient.setPowerState(id, state.toLowerCase());
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /co2/:id
 * Obtiene la lectura del sensor de CO2
 */
router.get('/co2/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reading = await tuyaClient.getCO2Reading(id);
    res.json({
      success: true,
      ...reading,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
