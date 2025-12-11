import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IoTGatewayService, DeviceStatus, CameraStreamInfo } from './iot-gateway.service';
import { CreateDeviceDto, UpdateDeviceDto, AssignDeviceDto } from './dto/device.dto';
import { Connector, DeviceType, Prisma } from '@prisma/client';

export interface ScannedDevice {
  id: string;
  name: string;
  connector: Connector;
  online: boolean;
  category?: string;
  model?: string;
  brand?: string;
  ip?: string;
  isAssigned: boolean;
  assignedTo?: {
    sectionId: string;
    sectionName: string;
  };
}

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private iotGateway: IoTGatewayService,
  ) {}

  /**
   * Lista todos los dispositivos registrados en la DB
   */
  async findAll() {
    return this.prisma.device.findMany({
      include: {
        section: {
          include: {
            room: true,
          },
        },
        controlledBy: true, // Dispositivo que controla a este
        controlledDevices: true, // Dispositivos que este controla
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Obtiene un dispositivo por ID
   */
  async findById(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            room: true,
          },
        },
        controlledBy: true,
        controlledDevices: true,
      },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return device;
  }

  /**
   * Crea un nuevo dispositivo en la DB
   */
  async create(data: CreateDeviceDto) {
    // Verificar que no exista un dispositivo con el mismo connector + externalId
    const existing = await this.prisma.device.findFirst({
      where: {
        connector: data.connector,
        externalId: data.externalId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Device with connector ${data.connector} and external ID ${data.externalId} already exists`,
      );
    }

    // Verificar que la sección existe si se proporciona
    if (data.sectionId) {
      const section = await this.prisma.section.findUnique({
        where: { id: data.sectionId },
      });

      if (!section) {
        throw new NotFoundException(`Section with ID ${data.sectionId} not found`);
      }
    }

    // Verificar que el dispositivo controlador existe si se proporciona
    if (data.controlledByDeviceId) {
      const controllerDevice = await this.prisma.device.findUnique({
        where: { id: data.controlledByDeviceId },
      });

      if (!controllerDevice) {
        throw new NotFoundException(`Controller device with ID ${data.controlledByDeviceId} not found`);
      }
    }

    const createData: Prisma.DeviceCreateInput = {
      name: data.name,
      connector: data.connector,
      externalId: data.externalId,
      type: data.type,
      metadata: data.metadata as Prisma.InputJsonValue,
      ...(data.sectionId && {
        section: { connect: { id: data.sectionId } },
      }),
      ...(data.controlledByDeviceId && {
        controlledBy: { connect: { id: data.controlledByDeviceId } },
      }),
    };

    return this.prisma.device.create({
      data: createData,
      include: {
        section: true,
        controlledBy: true,
        controlledDevices: true,
      },
    });
  }

  /**
   * Actualiza un dispositivo
   */
  async update(id: string, data: UpdateDeviceDto) {
    await this.findById(id);

    // Verificar que el dispositivo controlador existe si se proporciona
    if (data.controlledByDeviceId) {
      // Evitar auto-referencia
      if (data.controlledByDeviceId === id) {
        throw new ConflictException('A device cannot control itself');
      }

      const controllerDevice = await this.prisma.device.findUnique({
        where: { id: data.controlledByDeviceId },
      });

      if (!controllerDevice) {
        throw new NotFoundException(`Controller device with ID ${data.controlledByDeviceId} not found`);
      }
    }

    const updateData: Prisma.DeviceUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.connector && { connector: data.connector }),
      ...(data.externalId && { externalId: data.externalId }),
      ...(data.type && { type: data.type }),
      ...(data.metadata !== undefined && { metadata: data.metadata as Prisma.InputJsonValue }),
      ...(data.recordHistory !== undefined && { recordHistory: data.recordHistory }),
      ...(data.sectionId !== undefined && {
        section: data.sectionId ? { connect: { id: data.sectionId } } : { disconnect: true },
      }),
      ...(data.controlledByDeviceId !== undefined && {
        controlledBy: data.controlledByDeviceId 
          ? { connect: { id: data.controlledByDeviceId } } 
          : { disconnect: true },
      }),
    };

    return this.prisma.device.update({
      where: { id },
      data: updateData,
      include: {
        section: true,
        controlledBy: true,
        controlledDevices: true,
      },
    });
  }

  /**
   * Elimina un dispositivo
   */
  async delete(id: string) {
    await this.findById(id);

    return this.prisma.device.delete({
      where: { id },
    });
  }

  /**
   * Escanea todos los microservicios y compara con la DB
   * Devuelve dispositivos marcados como "nuevos" o "asignados"
   */
  async scanDevices(): Promise<ScannedDevice[]> {
    // Obtener dispositivos de todos los conectores
    const scanResults = await this.iotGateway.scanAllConnectors();

    // Obtener dispositivos ya registrados en la DB
    const registeredDevices = await this.prisma.device.findMany({
      include: {
        section: true,
      },
    });

    // Crear mapa para búsqueda rápida
    const registeredMap = new Map(
      registeredDevices.map((d) => [`${d.connector}:${d.externalId}`, d]),
    );

    // Combinar resultados
    const allDevices: ScannedDevice[] = [];

    for (const { connector, devices } of scanResults) {
      for (const device of devices) {
        const key = `${connector}:${device.id}`;
        const registered = registeredMap.get(key);

        allDevices.push({
          id: device.id,
          name: device.name,
          connector,
          online: device.online,
          category: device.category,
          model: device.model,
          brand: device.brand,
          ip: device.ip,
          isAssigned: !!registered?.sectionId,
          assignedTo: registered?.section
            ? {
                sectionId: registered.section.id,
                sectionName: registered.section.name,
              }
            : undefined,
        });
      }
    }

    return allDevices;
  }

  /**
   * Asigna un dispositivo a una sección
   * Si no existe en la DB, lo crea
   */
  async assignDevice(data: AssignDeviceDto) {
    // Verificar que la sección existe
    const section = await this.prisma.section.findUnique({
      where: { id: data.sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${data.sectionId} not found`);
    }

    // Buscar si el dispositivo ya existe
    const existing = await this.prisma.device.findFirst({
      where: {
        connector: data.connector,
        externalId: data.externalId,
      },
    });

    if (existing) {
      // Actualizar la asignación
      const updateData: Prisma.DeviceUpdateInput = {
        section: { connect: { id: data.sectionId } },
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.metadata && { metadata: data.metadata as Prisma.InputJsonValue }),
        ...(data.controlledByDeviceId && { controlledBy: { connect: { id: data.controlledByDeviceId } } }),
      };

      return this.prisma.device.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          section: {
            include: {
              room: true,
            },
          },
          controlledBy: true,
          controlledDevices: true,
        },
      });
    }

    // Validar campos requeridos para crear
    if (!data.name || !data.type) {
      throw new NotFoundException(
        'name and type are required when creating a new device assignment',
      );
    }

    // Crear nuevo dispositivo con asignación
    const createData: Prisma.DeviceCreateInput = {
      name: data.name,
      connector: data.connector,
      externalId: data.externalId,
      type: data.type,
      section: { connect: { id: data.sectionId } },
      ...(data.metadata && { metadata: data.metadata as Prisma.InputJsonValue }),
      ...(data.controlledByDeviceId && { controlledBy: { connect: { id: data.controlledByDeviceId } } }),
    };

    return this.prisma.device.create({
      data: createData,
      include: {
        section: {
          include: {
            room: true,
          },
        },
        controlledBy: true,
        controlledDevices: true,
      },
    });
  }

  /**
   * Obtiene el estado actual de un dispositivo (consultando al microservicio)
   * Para cámaras, incluye información adicional del stream
   * Para dispositivos VIRTUAL, obtiene el estado del dispositivo controlador
   */
  async getDeviceStatus(id: string): Promise<{ device: Awaited<ReturnType<typeof this.findById>>; status: DeviceStatus }> {
    const device = await this.findById(id);

    // Si es un dispositivo VIRTUAL, obtener el estado del controlador
    if (device.connector === Connector.VIRTUAL) {
      if (device.controlledBy) {
        // Obtener estado del dispositivo controlador
        const controllerStatus = await this.iotGateway.getDeviceStatus(
          device.controlledBy.connector,
          device.controlledBy.externalId,
        );
        
        // El estado puede venir como 'state' o 'switch' dependiendo del conector
        // Sonoff usa 'switch', otros usan 'state'
        const switchValue = controllerStatus.switch as string | undefined;
        const stateValue = controllerStatus.state;
        const rawState = stateValue || switchValue;
        // Normalizar a 'on' | 'off' | undefined
        const inheritedState: 'on' | 'off' | undefined = 
          rawState === 'on' ? 'on' : rawState === 'off' ? 'off' : undefined;
        
        return {
          device,
          status: {
            online: controllerStatus.online,
            state: inheritedState, // Heredar el estado ON/OFF del controlador
            switch: switchValue, // También incluir switch por compatibilidad
            controlledBy: {
              id: device.controlledBy.id,
              name: device.controlledBy.name,
              connector: device.controlledBy.connector,
            },
          },
        };
      }
      
      // Si no tiene controlador asignado
      return {
        device,
        status: {
          online: true,
          state: undefined,
          message: 'Este dispositivo virtual no tiene un controlador asignado',
        },
      };
    }

    const status = await this.iotGateway.getDeviceStatus(
      device.connector,
      device.externalId,
    );

    // Si es una cámara TAPO, agregar información adicional del stream
    if (device.type === DeviceType.CAMARA && device.connector === Connector.TAPO) {
      const streamInfo = await this.iotGateway.getCameraStreamInfo('high');
      const tapoServiceUrl = this.iotGateway.getTapoServiceUrl();
      
      return {
        device,
        status: {
          ...status,
          online: true,
          streamInfo: streamInfo,
          tapoServiceUrl,
        },
      };
    }

    return {
      device,
      status,
    };
  }

  /**
   * Obtiene información del stream de una cámara
   */
  async getCameraStreamInfo(id: string, quality: 'high' | 'low' = 'high'): Promise<CameraStreamInfo | null> {
    const device = await this.findById(id);

    if (device.type !== DeviceType.CAMARA || device.connector !== Connector.TAPO) {
      throw new NotFoundException('Este dispositivo no es una cámara TAPO');
    }

    return this.iotGateway.getCameraStreamInfo(quality);
  }

  /**
   * Captura un snapshot de una cámara
   */
  async captureSnapshot(id: string, quality: 'high' | 'low' = 'high') {
    const device = await this.findById(id);

    if (device.type !== DeviceType.CAMARA || device.connector !== Connector.TAPO) {
      throw new NotFoundException('Este dispositivo no es una cámara TAPO');
    }

    return this.iotGateway.captureSnapshot(quality);
  }

  /**
   * Lista los snapshots disponibles de una cámara
   */
  async listSnapshots(id: string) {
    const device = await this.findById(id);

    if (device.type !== DeviceType.CAMARA || device.connector !== Connector.TAPO) {
      throw new NotFoundException('Este dispositivo no es una cámara TAPO');
    }

    const snapshots = await this.iotGateway.listSnapshots();
    const tapoServiceUrl = this.iotGateway.getTapoServiceUrl();

    return {
      device,
      snapshots: snapshots.map(s => ({
        ...s,
        url: `${tapoServiceUrl}/snapshots/${s.filename}`,
      })),
    };
  }

  /**
   * Controla un dispositivo (on/off)
   * Para dispositivos VIRTUAL, controla el dispositivo padre (controlledBy)
   */
  async controlDevice(id: string, action: 'on' | 'off') {
    const device = await this.findById(id);

    // Si es un dispositivo VIRTUAL, controlar el dispositivo padre
    if (device.connector === Connector.VIRTUAL) {
      if (!device.controlledBy) {
        return {
          device,
          action,
          result: {
            success: false,
            message: 'Este dispositivo virtual no tiene un controlador asignado',
          },
        };
      }

      // Controlar el dispositivo padre
      const result = await this.iotGateway.controlDevice(
        device.controlledBy.connector,
        device.controlledBy.externalId,
        action,
      );

      return {
        device,
        action,
        controlledThrough: {
          id: device.controlledBy.id,
          name: device.controlledBy.name,
        },
        result,
      };
    }

    const result = await this.iotGateway.controlDevice(
      device.connector,
      device.externalId,
      action,
    );

    return {
      device,
      action,
      result,
    };
  }

  /**
   * Obtiene el estado de salud de todos los microservicios
   */
  async getConnectorsHealth() {
    return this.iotGateway.checkAllConnectorsHealth();
  }
}
