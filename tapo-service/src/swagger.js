module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Tapo Service API',
    version: '1.0.0',
    description: `API REST para cámara TP-Link Tapo C100.

## Funcionalidades

- **Stream RTSP**: URLs para video en vivo (alta y baja calidad)
- **Snapshots**: Captura y descarga de imágenes

## Configuración RTSP

La cámara debe tener habilitado el acceso RTSP:
1. Abrir app Tapo
2. Seleccionar la cámara
3. Configuración → Avanzado → Cuenta de cámara
4. Crear usuario y contraseña`,
    contact: {
      name: 'Automatización de Cultivo'
    }
  },
  servers: [
    {
      url: 'http://localhost:3003',
      description: 'Docker (puerto externo)',
    },
    {
      url: 'http://tapo-service:3000',
      description: 'Red Docker interna',
    },
  ],
  tags: [
    { name: 'Sistema', description: 'Estado del servicio' },
    { name: 'Dispositivos', description: 'Listado de dispositivos Tapo' },
    { name: 'Cámara', description: 'Información de la cámara' },
    { name: 'Stream', description: 'Video en vivo RTSP' },
    { name: 'Snapshots', description: 'Captura de imágenes' },
  ],
  paths: {
    '/devices': {
      get: {
        tags: ['Dispositivos'],
        summary: 'Listar dispositivos Tapo',
        description: 'Lista todos los dispositivos Tapo configurados (cámaras). Este endpoint es utilizado por el backend para escanear dispositivos IoT.',
        responses: {
          200: {
            description: 'Lista de dispositivos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeviceList' },
                example: {
                  success: true,
                  count: 1,
                  devices: [
                    {
                      id: 'tapo-camera-192-168-68-64',
                      name: 'Tapo Camera 192.168.68.64',
                      online: true,
                      category: 'camera',
                      model: 'Tapo C100',
                      brand: 'TP-Link',
                      ip: '192.168.68.64'
                    }
                  ]
                }
              },
            },
          },
          500: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Servicio funcionando',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'tapo-service' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/camera': {
      get: {
        tags: ['Cámara'],
        summary: 'Información de la cámara',
        description: 'Obtiene información de la cámara configurada y URLs de stream',
        responses: {
          200: {
            description: 'Información de la cámara',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CameraInfo' },
                example: {
                  success: true,
                  ip: '192.168.68.64',
                  model: 'TP-Link Tapo C100',
                  streams: {
                    high: {
                      quality: 'high',
                      stream: 'stream1',
                      url: 'rtsp://192.168.68.64:554/stream1',
                      requiresAuth: true
                    },
                    low: {
                      quality: 'low',
                      stream: 'stream2',
                      url: 'rtsp://192.168.68.64:554/stream2',
                      requiresAuth: true
                    }
                  }
                }
              },
            },
          },
        },
      },
    },
    '/stream': {
      get: {
        tags: ['Stream'],
        summary: 'Obtener URL del stream RTSP',
        description: 'Devuelve la URL RTSP para conectarse al video en vivo',
        parameters: [
          {
            name: 'quality',
            in: 'query',
            description: 'Calidad del stream',
            schema: {
              type: 'string',
              enum: ['high', 'low'],
              default: 'high'
            }
          }
        ],
        responses: {
          200: {
            description: 'URL del stream',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StreamInfo' },
                example: {
                  success: true,
                  cameraIp: '192.168.68.64',
                  quality: 'high',
                  stream: 'stream1',
                  url: 'rtsp://192.168.68.64:554/stream1',
                  requiresAuth: true,
                  usage: {
                    vlc: 'vlc "rtsp://192.168.68.64:554/stream1"',
                    ffplay: 'ffplay -rtsp_transport tcp "rtsp://192.168.68.64:554/stream1"'
                  }
                }
              },
            },
          },
        },
      },
    },
    '/snapshot': {
      post: {
        tags: ['Snapshots'],
        summary: 'Capturar snapshot',
        description: 'Captura una imagen del stream actual usando ffmpeg',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  quality: {
                    type: 'string',
                    enum: ['high', 'low'],
                    default: 'high',
                    description: 'Calidad del stream a capturar'
                  }
                }
              },
              example: { quality: 'high' }
            }
          }
        },
        responses: {
          200: {
            description: 'Snapshot capturado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SnapshotResult' },
                example: {
                  success: true,
                  filename: 'snapshot-2025-12-06T20-00-00-000Z.jpg',
                  size: 45678,
                  quality: 'high',
                  timestamp: '2025-12-06T20:00:00.000Z',
                  downloadUrl: '/snapshots/snapshot-2025-12-06T20-00-00-000Z.jpg'
                }
              },
            },
          },
          500: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/snapshots': {
      get: {
        tags: ['Snapshots'],
        summary: 'Listar snapshots',
        description: 'Lista todos los snapshots guardados',
        responses: {
          200: {
            description: 'Lista de snapshots',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SnapshotList' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Snapshots'],
        summary: 'Limpiar snapshots antiguos',
        description: 'Elimina snapshots antiguos manteniendo los más recientes',
        parameters: [
          {
            name: 'keep',
            in: 'query',
            description: 'Cantidad de snapshots a mantener',
            schema: {
              type: 'integer',
              default: 10
            }
          }
        ],
        responses: {
          200: {
            description: 'Limpieza completada',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Eliminados 5 snapshots, quedan 10',
                  deleted: 5,
                  remaining: 10
                }
              },
            },
          },
        },
      },
    },
    '/snapshots/{filename}': {
      get: {
        tags: ['Snapshots'],
        summary: 'Descargar snapshot',
        description: 'Descarga una imagen de snapshot específica',
        parameters: [
          {
            name: 'filename',
            in: 'path',
            required: true,
            description: 'Nombre del archivo de snapshot',
            schema: { type: 'string' },
            example: 'snapshot-2025-12-06T20-00-00-000Z.jpg'
          }
        ],
        responses: {
          200: {
            description: 'Imagen JPEG',
            content: {
              'image/jpeg': {
                schema: {
                  type: 'string',
                  format: 'binary'
                }
              }
            }
          },
          404: {
            description: 'Snapshot no encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        },
      },
    },
  },
  components: {
    schemas: {
      DeviceList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          count: { type: 'integer' },
          devices: {
            type: 'array',
            items: { $ref: '#/components/schemas/Device' }
          }
        }
      },
      Device: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID único del dispositivo' },
          name: { type: 'string', description: 'Nombre del dispositivo' },
          online: { type: 'boolean', description: 'Estado de conexión' },
          category: { type: 'string', description: 'Categoría del dispositivo' },
          model: { type: 'string', description: 'Modelo del dispositivo' },
          brand: { type: 'string', description: 'Marca del dispositivo' },
          ip: { type: 'string', description: 'Dirección IP del dispositivo' },
        }
      },
      CameraInfo: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          ip: { type: 'string' },
          model: { type: 'string' },
          streams: {
            type: 'object',
            properties: {
              high: { $ref: '#/components/schemas/StreamInfo' },
              low: { $ref: '#/components/schemas/StreamInfo' },
            }
          }
        }
      },
      StreamInfo: {
        type: 'object',
        properties: {
          quality: { type: 'string', enum: ['high', 'low'] },
          stream: { type: 'string' },
          url: { type: 'string', description: 'URL RTSP pública' },
          requiresAuth: { type: 'boolean' },
        }
      },
      SnapshotResult: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          filename: { type: 'string' },
          size: { type: 'integer', description: 'Tamaño en bytes' },
          quality: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          downloadUrl: { type: 'string' },
        }
      },
      SnapshotList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          count: { type: 'integer' },
          snapshots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                filename: { type: 'string' },
                size: { type: 'integer' },
                created: { type: 'string', format: 'date-time' },
                downloadUrl: { type: 'string' },
              }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        }
      }
    },
    responses: {
      Error: {
        description: 'Error del servidor',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    }
  }
};
