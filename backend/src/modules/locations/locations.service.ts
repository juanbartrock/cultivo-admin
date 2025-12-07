import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // ROOMS
  // ============================================

  async findAllRooms() {
    return this.prisma.room.findMany({
      include: {
        sections: {
          include: {
            _count: {
              select: {
                devices: true,
                plants: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findRoomById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            devices: true,
            plants: {
              include: {
                strain: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async createRoom(data: CreateRoomDto) {
    return this.prisma.room.create({
      data,
      include: {
        sections: true,
      },
    });
  }

  async updateRoom(id: string, data: UpdateRoomDto) {
    await this.findRoomById(id);

    return this.prisma.room.update({
      where: { id },
      data,
      include: {
        sections: true,
      },
    });
  }

  async deleteRoom(id: string) {
    await this.findRoomById(id);

    return this.prisma.room.delete({
      where: { id },
    });
  }

  async getRoomSections(roomId: string) {
    await this.findRoomById(roomId);

    return this.prisma.section.findMany({
      where: { roomId },
      include: {
        _count: {
          select: {
            devices: true,
            plants: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ============================================
  // SECTIONS
  // ============================================

  async findAllSections() {
    return this.prisma.section.findMany({
      include: {
        room: true,
        devices: true,
        plants: true,
        _count: {
          select: {
            devices: true,
            plants: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findSectionById(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        room: true,
        devices: true,
        plants: {
          include: {
            strain: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }

  async createSection(data: CreateSectionDto) {
    // Verificar que la room existe
    const room = await this.prisma.room.findUnique({
      where: { id: data.roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${data.roomId} not found`);
    }

    return this.prisma.section.create({
      data,
      include: {
        room: true,
      },
    });
  }

  async updateSection(id: string, data: UpdateSectionDto) {
    await this.findSectionById(id);

    return this.prisma.section.update({
      where: { id },
      data,
      include: {
        room: true,
      },
    });
  }

  async deleteSection(id: string) {
    await this.findSectionById(id);

    return this.prisma.section.delete({
      where: { id },
    });
  }

  /**
   * Dashboard de una sección
   * Devuelve datos de la carpa, dispositivos asignados y resumen de plantas
   */
  async getSectionDashboard(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        room: true,
        devices: true,
        plants: {
          include: {
            strain: true,
            cycle: true,
          },
          where: {
            stage: {
              notIn: ['CURADO'],
            },
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    // Agrupar plantas por etapa
    const plantsByStage = section.plants.reduce(
      (acc, plant) => {
        acc[plant.stage] = (acc[plant.stage] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ...section,
      summary: {
        totalPlants: section.plants.length,
        totalDevices: section.devices.length,
        plantsByStage,
      },
    };
  }
}
