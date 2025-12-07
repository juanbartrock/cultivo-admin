const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Sonoff eWeLink Service API',
    description: `API REST para controlar dispositivos Sonoff via eWeLink.
    
Este servicio permite:
- Leer temperatura y humedad del sensor THS01
- Controlar el encendido/apagado del Sonoff TH Elite THR320D
- Listar dispositivos de la cuenta eWeLink`,
    version: '1.0.0',
    contact: {
      name: 'Automatización de Cultivo'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local'
    }
  ],
  tags: [
    {
      name: 'Sistema',
      description: 'Endpoints de estado del servicio'
    },
    {
      name: 'Dispositivos',
      description: 'Gestión de dispositivos eWeLink'
    },
    {
      name: 'Control',
      description: 'Control del dispositivo objetivo'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check',
        description: 'Verifica que el servicio esté funcionando correctamente',
        responses: {
          '200': {
            description: 'Servicio funcionando',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok'
                    },
                    service: {
                      type: 'string',
                      example: 'sonoff-ewelink-service'
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-12-06T17:58:00.000Z'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/devices': {
      get: {
        tags: ['Dispositivos'],
        summary: 'Listar dispositivos',
        description: 'Obtiene la lista de todos los dispositivos de la cuenta eWeLink',
        responses: {
          '200': {
            description: 'Lista de dispositivos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    count: {
                      type: 'integer',
                      example: 1
                    },
                    devices: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Device'
                      }
                    }
                  }
                }
              }
            }
          },
          '500': {
            $ref: '#/components/responses/Error'
          }
        }
      }
    },
    '/device/status': {
      get: {
        tags: ['Control'],
        summary: 'Estado del dispositivo',
        description: 'Obtiene el estado actual del dispositivo objetivo incluyendo temperatura, humedad y estado de encendido',
        responses: {
          '200': {
            description: 'Estado del dispositivo',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DeviceStatus'
                }
              }
            }
          },
          '500': {
            $ref: '#/components/responses/Error'
          }
        }
      }
    },
    '/device/power': {
      post: {
        tags: ['Control'],
        summary: 'Cambiar estado de encendido',
        description: 'Enciende o apaga el dispositivo objetivo',
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
                    example: 'on'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Estado cambiado exitosamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PowerResponse'
                }
              }
            }
          },
          '400': {
            description: 'Estado inválido',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            $ref: '#/components/responses/Error'
          }
        }
      }
    },
    '/device/toggle': {
      post: {
        tags: ['Control'],
        summary: 'Alternar estado',
        description: 'Alterna el estado del dispositivo (si está encendido lo apaga y viceversa)',
        responses: {
          '200': {
            description: 'Estado alternado exitosamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PowerResponse'
                }
              }
            }
          },
          '500': {
            $ref: '#/components/responses/Error'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Device: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'ID único del dispositivo',
            example: '10018e3624'
          },
          name: {
            type: 'string',
            description: 'Nombre del dispositivo',
            example: 'Termohigometro Indoor'
          },
          brand: {
            type: 'string',
            description: 'Marca del dispositivo',
            example: 'SONOFF'
          },
          model: {
            type: 'string',
            description: 'Modelo del dispositivo',
            example: 'TH Elite'
          },
          online: {
            type: 'boolean',
            description: 'Estado de conexión',
            example: true
          }
        }
      },
      DeviceStatus: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          deviceId: {
            type: 'string',
            example: '10018e3624'
          },
          name: {
            type: 'string',
            example: 'Termohigometro Indoor'
          },
          online: {
            type: 'boolean',
            example: true
          },
          switch: {
            type: 'string',
            enum: ['on', 'off', 'unknown'],
            description: 'Estado del relé',
            example: 'on'
          },
          temperature: {
            type: 'string',
            nullable: true,
            description: 'Temperatura en grados (según unidad)',
            example: '30.0'
          },
          humidity: {
            type: 'string',
            nullable: true,
            description: 'Humedad relativa en porcentaje',
            example: '69.3'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Unidad de temperatura',
            example: 'celsius'
          }
        }
      },
      PowerResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          deviceId: {
            type: 'string',
            example: '10018e3624'
          },
          state: {
            type: 'string',
            enum: ['on', 'off'],
            example: 'on'
          },
          message: {
            type: 'string',
            example: 'Dispositivo encendido correctamente'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            example: 'Descripción del error'
          }
        }
      }
    },
    responses: {
      Error: {
        description: 'Error del servidor',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    }
  }
};

module.exports = swaggerDocument;



