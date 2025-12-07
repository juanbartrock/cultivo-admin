const express = require('express');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const swaggerDocument = require('./swagger');
const ewelinkClient = require('./ewelink');

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
  customSiteTitle: 'Sonoff API - Documentación'
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
      'GET /device/status',
      'POST /device/power',
      'POST /device/toggle',
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
    console.log('Sonoff eWeLink Service');
    console.log('='.repeat(50));

    // Inicializar cliente eWeLink
    await ewelinkClient.initialize();

    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`Servidor iniciado en puerto ${PORT}`);
      console.log('');
      console.log(`Documentación: http://localhost:${PORT}/docs`);
      console.log('');
      console.log('Endpoints:');
      console.log(`  GET  /health        - Health check`);
      console.log(`  GET  /devices       - Listar dispositivos`);
      console.log(`  GET  /device/status - Estado del sensor`);
      console.log(`  POST /device/power  - Encender/Apagar`);
      console.log(`  POST /device/toggle - Alternar estado`);
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

