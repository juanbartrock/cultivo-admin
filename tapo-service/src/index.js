const express = require('express');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const swaggerDocument = require('./swagger');
const tapoClient = require('./tapo');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS - permite peticiones desde el frontend
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

// Logging de requests (excepto /docs)
app.use((req, res, next) => {
  if (!req.path.startsWith('/docs')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Tapo API - Documentación'
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
      'GET /camera',
      'GET /stream',
      'POST /snapshot',
      'GET /snapshots',
      'GET /snapshots/:filename',
      'DELETE /snapshots',
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
function start() {
  console.log('='.repeat(50));
  console.log('Tapo Service');
  console.log('='.repeat(50));

  let initialized = false;

  try {
    // Inicializar cliente Tapo
    tapoClient.initialize();
    initialized = true;
  } catch (error) {
    console.error('[Warning] Error al configurar Tapo:', error.message);
    console.log('[Info] Configura TAPO_CAMERA_IP, TAPO_USERNAME y TAPO_PASSWORD');
  }

  // Iniciar servidor HTTP
  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`Servidor iniciado en puerto ${PORT}`);
    console.log('');
    console.log(`Estado: ${initialized ? 'CONFIGURADO ✓' : 'NO CONFIGURADO ✗'}`);
    if (initialized) {
      console.log(`Cámara IP: ${tapoClient.cameraIp}`);
    }
    console.log('');
    console.log(`Documentación: http://localhost:${PORT}/docs`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  GET  /health            - Health check`);
    console.log(`  GET  /devices           - Listar dispositivos Tapo`);
    console.log(`  GET  /camera            - Info de la cámara`);
    console.log(`  GET  /stream            - URL del stream RTSP`);
    console.log(`  POST /snapshot          - Capturar imagen`);
    console.log(`  GET  /snapshots         - Listar capturas`);
    console.log(`  GET  /snapshots/:file   - Descargar imagen`);
    console.log('='.repeat(50));
  });
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
