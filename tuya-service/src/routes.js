const express = require('express');
const tuyaClient = require('./tuya');

const router = express.Router();

/**
 * GET /health
 * Health check del servicio
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tuya-service',
    timestamp: new Date().toISOString(),
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
