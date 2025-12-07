module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'ESP32 IoT Service API',
    version: '1.0.0',
    description: 'API para control de dispositivos ESP32 con relays y sensores DHT11',
  },
  servers: [
    {
      url: 'http://localhost:3004',
      description: 'Servidor local',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check del servicio',
        responses: {
          200: {
            description: 'Servicio funcionando correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'esp32-service' },
                    timestamp: { type: 'string', format: 'date-time' },
                    devices: { type: 'integer', example: 1 },
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
        summary: 'Listar todos los dispositivos ESP32',
        responses: {
          200: {
            description: 'Lista de dispositivos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    devices: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'carpa1' },
                          name: { type: 'string', example: 'carpa1' },
                          ip: { type: 'string', example: '192.168.1.100' },
                          port: { type: 'integer', example: 80 },
                          online: { type: 'boolean' },
                          lastSeen: { type: 'string', format: 'date-time' },
                          type: { type: 'string', example: 'esp32-relay-dht11' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/device/{deviceId}/status': {
      get: {
        tags: ['Dispositivos'],
        summary: 'Obtener estado completo del dispositivo',
        parameters: [
          {
            name: 'deviceId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'carpa1',
          },
        ],
        responses: {
          200: {
            description: 'Estado del dispositivo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    deviceId: { type: 'string' },
                    online: { type: 'boolean' },
                    relays: {
                      type: 'object',
                      properties: {
                        relay1: { type: 'boolean' },
                        relay2: { type: 'boolean' },
                      },
                    },
                    sensors: {
                      type: 'object',
                      properties: {
                        temperature: { type: 'number', example: 25.5 },
                        humidity: { type: 'number', example: 60.0 },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Dispositivo no encontrado',
          },
        },
      },
    },
    '/device/{deviceId}/sensors': {
      get: {
        tags: ['Sensores'],
        summary: 'Obtener lectura de sensores DHT11',
        parameters: [
          {
            name: 'deviceId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'carpa1',
          },
        ],
        responses: {
          200: {
            description: 'Lectura de sensores',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    deviceId: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    temperature: { type: 'number', example: 25.5 },
                    humidity: { type: 'number', example: 60.0 },
                    heatIndex: { type: 'number', example: 26.2 },
                  },
                },
              },
            },
          },
          404: {
            description: 'Dispositivo no encontrado',
          },
        },
      },
    },
    '/device/{deviceId}/relay/{relayId}/power': {
      post: {
        tags: ['Relays'],
        summary: 'Encender o apagar un relay',
        parameters: [
          {
            name: 'deviceId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'carpa1',
          },
          {
            name: 'relayId',
            in: 'path',
            required: true,
            schema: { type: 'integer', enum: [1, 2] },
            example: 1,
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
                    oneOf: [
                      { type: 'boolean' },
                      { type: 'string', enum: ['on', 'off'] },
                    ],
                    example: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Relay controlado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    deviceId: { type: 'string' },
                    relayId: { type: 'integer' },
                    state: { type: 'string', enum: ['on', 'off'] },
                  },
                },
              },
            },
          },
          404: {
            description: 'Dispositivo no encontrado',
          },
        },
      },
    },
    '/device/{deviceId}/relay/{relayId}/toggle': {
      post: {
        tags: ['Relays'],
        summary: 'Alternar estado de un relay',
        parameters: [
          {
            name: 'deviceId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'carpa1',
          },
          {
            name: 'relayId',
            in: 'path',
            required: true,
            schema: { type: 'integer', enum: [1, 2] },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: 'Relay alternado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    deviceId: { type: 'string' },
                    relayId: { type: 'integer' },
                    state: { type: 'string', enum: ['on', 'off'] },
                  },
                },
              },
            },
          },
          404: {
            description: 'Dispositivo no encontrado',
          },
        },
      },
    },
  },
  tags: [
    { name: 'Sistema', description: 'Endpoints del sistema' },
    { name: 'Dispositivos', description: 'Gestión de dispositivos ESP32' },
    { name: 'Sensores', description: 'Lectura de sensores' },
    { name: 'Relays', description: 'Control de relays' },
  ],
};
