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

    const createData: Prisma.DeviceCreateInput = {
      name: data.name,
      connector: data.connector,
      externalId: data.externalId,
      type: data.type,
      metadata: data.metadata as Prisma.InputJsonValue,
      ...(data.sectionId && {
        section: { connect: { id: data.sectionId } },
      }),
    };

    return this.prisma.device.create({
      data: createData,
      include: {
        section: true,
      },
    });
  }

  /**
   * Actualiza un dispositivo
   */
  async update(id: string, data: UpdateDeviceDto) {
    await this.findById(id);

    const updateData: Prisma.DeviceUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.connector && { connector: data.connector }),
      ...(data.externalId && { externalId: data.externalId }),
      ...(data.type && { type: data.type }),
      ...(data.metadata !== undefined && { metadata: data.metadata as Prisma.InputJsonValue }),
      ...(data.sectionId !== undefined && {
        section: data.sectionId ? { connect: { id: data.sectionId } } : { disconnect: true },
      }),
    };

    return this.prisma.device.update({
      where: { id },
      data: updateData,
      include: {
        section: true,
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
    };

    return this.prisma.device.create({
      data: createData,
      include: {
        section: {
          include: {
            room: true,
          },
        },
      },
    });
  }

  /**
   * Obtiene el estado actual de un dispositivo (consultando al microservicio)
   * Para cámaras, incluye información adicional del stream
   */
  async getDeviceStatus(id: string): Promise<{ device: Awaited<ReturnType<typeof this.findById>>; status: DeviceStatus }> {
    const device = await this.findById(id);

    const status = await this.iotGateway.getDeviceStatus(
      device.connector,
      device.externalId,
    );

    // Si es una cámara TAPO, agregar información del stream
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
   */
  async controlDevice(id: string, action: 'on' | 'off') {
    const device = await this.findById(id);

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
