const express = require('express');
const esp32Client = require('./esp32-client');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'esp32-service',
    timestamp: new Date().toISOString(),
    devices: esp32Client.getDevices().length,
  });
});

// Listar todos los dispositivos ESP32
router.get('/devices', (req, res) => {
  try {
    const devices = esp32Client.getDevices();
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

// Obtener estado de un dispositivo
router.get('/device/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const status = await esp32Client.getDeviceStatus(deviceId);
    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    res.status(error.message.includes('no encontrado') ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

// Obtener lectura de sensores
router.get('/device/:deviceId/sensors', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const sensors = await esp32Client.getSensors(deviceId);
    res.json({
      success: true,
      ...sensors,
    });
  } catch (error) {
    res.status(error.message.includes('no encontrado') ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

// Controlar relay (encender/apagar)
router.post('/device/:deviceId/relay/:relayId/power', async (req, res) => {
  try {
    const { deviceId, relayId } = req.params;
    const { state } = req.body;
    
    if (state === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro "state" (true/false o "on"/"off")',
      });
    }

    const stateBoolean = state === true || state === 'on' || state === 1;
    const result = await esp32Client.setRelayPower(deviceId, relayId, stateBoolean);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(error.message.includes('no encontrado') ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

// Toggle relay
router.post('/device/:deviceId/relay/:relayId/toggle', async (req, res) => {
  try {
    const { deviceId, relayId } = req.params;
    const result = await esp32Client.toggleRelay(deviceId, relayId);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(error.message.includes('no encontrado') ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
