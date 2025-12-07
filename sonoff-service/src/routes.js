const express = require('express');
const ewelinkClient = require('./ewelink');

const router = express.Router();

/**
 * GET /health
 * Health check del servicio
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sonoff-ewelink-service',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /devices
 * Lista todos los dispositivos de la cuenta eWeLink
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await ewelinkClient.getDevices();
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
 * GET /device/status
 * Obtiene temperatura, humedad y estado on/off del dispositivo objetivo
 */
router.get('/device/status', async (req, res) => {
  try {
    const status = await ewelinkClient.getDeviceStatus();
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
 * POST /device/power
 * Cambia el estado de encendido/apagado
 * Body: { "state": "on" } o { "state": "off" }
 */
router.post('/device/power', async (req, res) => {
  try {
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

    const result = await ewelinkClient.setPowerState(state.toLowerCase());
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /device/toggle
 * Alterna el estado del dispositivo (toggle)
 */
router.post('/device/toggle', async (req, res) => {
  try {
    const result = await ewelinkClient.togglePower();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;



