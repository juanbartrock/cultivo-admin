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
  customSiteTitle: 'Tapo Cloud API - Documentación'
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
async function start() {
  console.log('='.repeat(50));
  console.log('Tapo Cloud Service v2.0');
  console.log('='.repeat(50));

  let initialized = false;

  try {
    // Inicializar cliente Tapo via Cloud
    await tapoClient.initialize();
    initialized = true;
  } catch (error) {
    console.error('[Warning] Error al conectar con Tapo Cloud:', error.message);
    console.log('[Info] Configura TAPO_EMAIL y TAPO_PASSWORD con tus credenciales de TP-Link');
  }

  // Iniciar servidor HTTP
  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`Servidor iniciado en puerto ${PORT}`);
    console.log('');
    console.log(`Conexión: ${initialized ? 'CLOUD ✓' : 'NO CONECTADO ✗'}`);
    if (initialized) {
      const info = tapoClient.getCameraInfo();
      if (info.connected) {
        console.log(`Cámara: ${info.name} (${info.model})`);
      }
    }
    console.log('');
    console.log(`Documentación: http://localhost:${PORT}/docs`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  GET  /health            - Health check`);
    console.log(`  GET  /devices           - Listar cámaras Tapo`);
    console.log(`  GET  /camera            - Info de la cámara`);
    console.log(`  GET  /stream            - URL del stream RTSP (local)`);
    console.log(`  POST /snapshot          - Capturar imagen via Cloud`);
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
