module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Tuya Service API',
    version: '1.0.0',
    description: `API REST para controlar dispositivos Tuya Smart.

## Dispositivos soportados

### Sensor de Calidad de Aire (flora-CO2)
- CO2 (ppm)
- Temperatura (°C)
- Humedad (%)
- PM2.5, PM1, PM10
- VOC, CH2O
- Índice de calidad de aire

### Enchufes Inteligentes
- vege-extractor
- vege-led-150

## Autenticación
Este servicio usa credenciales de Tuya Cloud API configuradas en variables de entorno.`,
    contact: {
      name: 'Automatización de Cultivo'
    }
  },
  servers: [
    {
      url: 'http://localhost:3002',
      description: 'Docker (puerto externo)',
    },
    {
      url: 'http://tuya-service:3000',
      description: 'Red Docker interna',
    },
  ],
  tags: [
    { name: 'Sistema', description: 'Estado del servicio' },
    { name: 'Dispositivos', description: 'Gestión de dispositivos Tuya' },
    { name: 'Sensor CO2', description: 'Lecturas del sensor de calidad de aire' },
    { name: 'Control', description: 'Control de enchufes inteligentes' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check',
        description: 'Verifica que el servicio esté funcionando y conectado a Tuya',
        responses: {
          200: {
            description: 'Servicio funcionando',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'tuya-service' },
                    timestamp: { type: 'string', format: 'date-time', example: '2025-12-06T19:38:00.000Z' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/devices': {
      get: {
        tags: ['Dispositivos'],
        summary: 'Listar dispositivos',
        description: 'Obtiene la lista de todos los dispositivos Tuya vinculados a la cuenta',
        responses: {
          200: {
            description: 'Lista de dispositivos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeviceList' },
                example: {
                  success: true,
                  count: 3,
                  devices: [
                    {
                      deviceId: 'ebfa686328c2caa8a9aafb',
                      name: 'flora-CO2',
                      category: 'hjjcy',
                      productName: 'Nobito-2CO8/10',
                      online: true,
                      ip: '190.16.12.87'
                    },
                    {
                      deviceId: 'eb2dd63c87ec9d5bb391p5',
                      name: 'vege-extractor',
                      category: 'cz',
                      productName: 'ENCHUFE SMART MACROLED',
                      online: true,
                      ip: '190.16.12.87'
                    },
                    {
                      deviceId: 'eb2ec61130a11f5b19lbic',
                      name: 'vege-led-150',
                      category: 'cz',
                      productName: 'ENCHUFE SMART MACROLED',
                      online: true,
                      ip: '190.16.12.87'
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
    '/device/{id}/status': {
      get: {
        tags: ['Dispositivos'],
        summary: 'Estado de dispositivo',
        description: 'Obtiene el estado completo de un dispositivo específico con todos sus parámetros',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID del dispositivo Tuya',
            schema: { type: 'string' },
            example: 'eb2dd63c87ec9d5bb391p5'
          },
        ],
        responses: {
          200: {
            description: 'Estado del dispositivo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeviceStatus' },
                example: {
                  success: true,
                  deviceId: 'eb2dd63c87ec9d5bb391p5',
                  name: 'vege-extractor',
                  category: 'cz',
                  online: true,
                  status: {
                    switch_1: true,
                    countdown_1: 0,
                    relay_status: 'last',
                    child_lock: false
                  }
                }
              },
            },
          },
          500: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/device/{id}/power': {
      post: {
        tags: ['Control'],
        summary: 'Encender/Apagar dispositivo',
        description: 'Controla el estado de encendido/apagado de un enchufe inteligente',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID del enchufe inteligente',
            schema: { type: 'string' },
            examples: {
              extractor: {
                value: 'eb2dd63c87ec9d5bb391p5',
                summary: 'vege-extractor'
              },
              led: {
                value: 'eb2ec61130a11f5b19lbic',
                summary: 'vege-led-150'
              }
            }
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['state'],
                properties: {
                  state: {
                    type: 'string',
                    enum: ['on', 'off'],
                    description: 'Estado deseado del dispositivo',
                  },
                },
              },
              examples: {
                encender: {
                  value: { state: 'on' },
                  summary: 'Encender'
                },
                apagar: {
                  value: { state: 'off' },
                  summary: 'Apagar'
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: 'Estado cambiado exitosamente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PowerResponse' },
                example: {
                  success: true,
                  deviceId: 'eb2dd63c87ec9d5bb391p5',
                  state: 'on',
                  message: 'Dispositivo encendido correctamente'
                }
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/co2/{id}': {
      get: {
        tags: ['Sensor CO2'],
        summary: 'Lectura del sensor de calidad de aire',
        description: `Obtiene todas las lecturas del sensor de calidad de aire incluyendo:
- **CO2**: Dióxido de carbono (ppm)
- **Temperatura**: En grados Celsius
- **Humedad**: Humedad relativa (%)
- **PM2.5, PM1, PM10**: Material particulado
- **VOC**: Compuestos orgánicos volátiles
- **CH2O**: Formaldehído`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID del sensor de CO2',
            schema: { type: 'string' },
            example: 'ebfa686328c2caa8a9aafb'
          },
        ],
        responses: {
          200: {
            description: 'Lectura del sensor',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CO2Reading' },
                example: {
                  success: true,
                  deviceId: 'ebfa686328c2caa8a9aafb',
                  name: 'flora-CO2',
                  online: true,
                  co2: 407,
                  temperature: 32.2,
                  humidity: 50,
                  unit: {
                    co2: 'ppm',
                    temperature: 'celsius',
                    humidity: '%'
                  },
                  rawStatus: {
                    air_quality_index: 'level_1',
                    temp_current: 322,
                    humidity_value: 50,
                    co2_value: 407,
                    ch2o_value: 4,
                    voc_value: 6,
                    pm25_value: 21,
                    pm1: 15,
                    pm10: 24,
                    battery_state: 'low',
                    battery_percentage: 100
                  }
                }
              },
            },
          },
          500: { $ref: '#/components/responses/Error' },
        },
      },
    },
  },
  components: {
    schemas: {
      Device: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', description: 'ID único del dispositivo' },
          name: { type: 'string', description: 'Nombre del dispositivo' },
          category: { type: 'string', description: 'Categoría (cz=enchufe, hjjcy=sensor aire)' },
          productName: { type: 'string', description: 'Nombre del producto' },
          online: { type: 'boolean', description: 'Estado de conexión' },
          ip: { type: 'string', description: 'Dirección IP' },
        },
      },
      DeviceList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          count: { type: 'integer' },
          devices: {
            type: 'array',
            items: { $ref: '#/components/schemas/Device' },
          },
        },
      },
      DeviceStatus: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          deviceId: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          online: { type: 'boolean' },
          status: {
            type: 'object',
            description: 'Estados del dispositivo como key-value',
            additionalProperties: true,
          },
          rawStatus: {
            type: 'array',
            description: 'Estados en formato original de Tuya',
          },
        },
      },
      PowerResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          deviceId: { type: 'string' },
          state: { type: 'string', enum: ['on', 'off'] },
          message: { type: 'string' },
        },
      },
      CO2Reading: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          deviceId: { type: 'string' },
          name: { type: 'string' },
          online: { type: 'boolean' },
          co2: { type: 'integer', description: 'Nivel de CO2 en ppm' },
          temperature: { type: 'number', description: 'Temperatura en Celsius' },
          humidity: { type: 'integer', description: 'Humedad relativa %' },
          unit: {
            type: 'object',
            properties: {
              co2: { type: 'string', example: 'ppm' },
              temperature: { type: 'string', example: 'celsius' },
              humidity: { type: 'string', example: '%' },
            },
          },
          rawStatus: {
            type: 'object',
            description: 'Todos los valores del sensor',
            properties: {
              air_quality_index: { type: 'string', description: 'Índice de calidad del aire' },
              co2_value: { type: 'integer', description: 'CO2 en ppm' },
              temp_current: { type: 'integer', description: 'Temperatura x10' },
              humidity_value: { type: 'integer', description: 'Humedad %' },
              pm25_value: { type: 'integer', description: 'PM2.5 µg/m³' },
              pm1: { type: 'integer', description: 'PM1 µg/m³' },
              pm10: { type: 'integer', description: 'PM10 µg/m³' },
              voc_value: { type: 'integer', description: 'VOC' },
              ch2o_value: { type: 'integer', description: 'Formaldehído' },
              battery_percentage: { type: 'integer', description: 'Batería %' },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
    },
    responses: {
      Error: {
        description: 'Error del servidor',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, error: 'Descripción del error' }
          },
        },
      },
      BadRequest: {
        description: 'Parámetros inválidos',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, error: 'Estado inválido. Usar "on" o "off"' }
          },
        },
      },
    },
  },
};
