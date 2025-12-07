const express = require('express');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const swaggerDocument = require('./swagger');
const esp32Client = require('./esp32-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware para parsear JSON
app.use(express.json());

// Logging de requests
app.use((req, res, next) => {
  if (!req.path.startsWith('/docs')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ESP32 API - Documentación'
}));

// Redirección raíz a docs
app.get('/', (req, res) => {
  res.redirect('/docs');
});

// Rutas de la API
app.use('/', routes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    availableEndpoints: [
      'GET /health',
      'GET /devices',
      'GET /device/:deviceId/status',
      'GET /device/:deviceId/sensors',
      'POST /device/:deviceId/relay/:relayId/power',
      'POST /device/:deviceId/relay/:relayId/toggle',
    ],
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
  });
});

// Iniciar servidor
async function start() {
  try {
    console.log('='.repeat(50));
    console.log('ESP32 IoT Service');
    console.log('='.repeat(50));

    // Inicializar cliente ESP32
    await esp32Client.initialize();

    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`Servidor iniciado en puerto ${PORT}`);
      console.log('');
      console.log(`Documentación: http://localhost:${PORT}/docs`);
      console.log('');
      console.log('Endpoints:');
      console.log(`  GET  /health                          - Health check`);
      console.log(`  GET  /devices                         - Listar dispositivos`);
      console.log(`  GET  /device/:id/status               - Estado del dispositivo`);
      console.log(`  GET  /device/:id/sensors              - Lectura de sensores`);
      console.log(`  POST /device/:id/relay/:relay/power   - Control de relay`);
      console.log(`  POST /device/:id/relay/:relay/toggle  - Toggle relay`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('[Fatal] Error al iniciar el servicio:', error.message);
    process.exit(1);
  }
}

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('[Shutdown] Recibida señal SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Shutdown] Recibida señal SIGINT');
  process.exit(0);
});

start();
