import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateHarvestDto,
  UpdateHarvestDto,
  CreateHarvestProductDto,
  UpdateHarvestProductDto,
  ExtractMaterialDto,
} from './dto/harvest.dto';
import { HarvestProductType, StorageLocation } from '@prisma/client';

@Injectable()
export class HarvestService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // HARVESTS
  // ============================================

  /**
   * Lista todas las cosechas
   */
  async findAllHarvests(plantId?: string) {
    return this.prisma.harvest.findMany({
      where: plantId ? { plantId } : undefined,
      include: {
        plant: {
          include: {
            strain: true,
            cycle: true,
          },
        },
        products: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { harvestDate: 'desc' },
    });
  }

  /**
   * Obtiene una cosecha por ID
   */
  async findHarvestById(id: string) {
    const harvest = await this.prisma.harvest.findUnique({
      where: { id },
      include: {
        plant: {
          include: {
            strain: true,
            cycle: true,
            section: true,
          },
        },
        products: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!harvest) {
      throw new NotFoundException(`Harvest with ID ${id} not found`);
    }

    return harvest;
  }

  /**
   * Crea una nueva cosecha
   */
  async createHarvest(data: CreateHarvestDto) {
    // Verificar que la planta existe
    const plant = await this.prisma.plant.findUnique({
      where: { id: data.plantId },
    });

    if (!plant) {
      throw new NotFoundException(`Plant with ID ${data.plantId} not found`);
    }

    return this.prisma.harvest.create({
      data: {
        plant: { connect: { id: data.plantId } },
        harvestDate: new Date(data.harvestDate),
        wetWeight: data.wetWeight,
        dryWeight: data.dryWeight,
        trimWeight: data.trimWeight,
        notes: data.notes,
      },
      include: {
        plant: {
          include: {
            strain: true,
          },
        },
        products: true,
      },
    });
  }

  /**
   * Actualiza una cosecha
   */
  async updateHarvest(id: string, data: UpdateHarvestDto) {
    await this.findHarvestById(id);

    return this.prisma.harvest.update({
      where: { id },
      data: {
        ...(data.harvestDate && { harvestDate: new Date(data.harvestDate) }),
        ...(data.wetWeight !== undefined && { wetWeight: data.wetWeight }),
        ...(data.dryWeight !== undefined && { dryWeight: data.dryWeight }),
        ...(data.trimWeight !== undefined && { trimWeight: data.trimWeight }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        plant: {
          include: {
            strain: true,
          },
        },
        products: true,
      },
    });
  }

  /**
   * Elimina una cosecha
   */
  async deleteHarvest(id: string) {
    await this.findHarvestById(id);
    return this.prisma.harvest.delete({ where: { id } });
  }

  // ============================================
  // HARVEST PRODUCTS
  // ============================================

  /**
   * Lista todos los productos de cosecha
   */
  async findAllProducts(harvestId?: string, type?: HarvestProductType) {
    return this.prisma.harvestProduct.findMany({
      where: {
        ...(harvestId && { harvestId }),
        ...(type && { type }),
      },
      include: {
        harvest: {
          include: {
            plant: {
              include: {
                strain: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtiene un producto por ID
   */
  async findProductById(id: string) {
    const product = await this.prisma.harvestProduct.findUnique({
      where: { id },
      include: {
        harvest: {
          include: {
            plant: {
              include: {
                strain: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Harvest product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Crea un nuevo producto de cosecha
   */
  async createProduct(data: CreateHarvestProductDto) {
    // Verificar que la cosecha existe
    await this.findHarvestById(data.harvestId);

    return this.prisma.harvestProduct.create({
      data: {
        harvest: { connect: { id: data.harvestId } },
        type: data.type,
        initialWeight: data.initialWeight,
        currentWeight: data.initialWeight, // Inicialmente igual al peso inicial
        packageType: data.packageType,
        packageNumber: data.packageNumber,
        storageLocation: data.storageLocation || StorageLocation.AMBIENTE,
        notes: data.notes,
      },
      include: {
        harvest: true,
      },
    });
  }

  /**
   * Actualiza un producto
   */
  async updateProduct(id: string, data: UpdateHarvestProductDto) {
    await this.findProductById(id);

    return this.prisma.harvestProduct.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.currentWeight !== undefined && { currentWeight: data.currentWeight }),
        ...(data.packageType !== undefined && { packageType: data.packageType }),
        ...(data.packageNumber !== undefined && { packageNumber: data.packageNumber }),
        ...(data.storageLocation && { storageLocation: data.storageLocation }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        harvest: true,
      },
    });
  }

  /**
   * Extrae material de un producto (reduce el peso actual)
   */
  async extractMaterial(id: string, data: ExtractMaterialDto) {
    const product = await this.findProductById(id);

    if (data.amount > product.currentWeight) {
      throw new BadRequestException(
        `Cannot extract ${data.amount}g from product with ${product.currentWeight}g remaining`,
      );
    }

    const newWeight = product.currentWeight - data.amount;

    return this.prisma.harvestProduct.update({
      where: { id },
      data: {
        currentWeight: newWeight,
        notes: data.notes
          ? `${product.notes || ''}\n[${new Date().toISOString()}] Extracted ${data.amount}g: ${data.notes}`
          : product.notes,
      },
      include: {
        harvest: true,
      },
    });
  }

  /**
   * Elimina un producto
   */
  async deleteProduct(id: string) {
    await this.findProductById(id);
    return this.prisma.harvestProduct.delete({ where: { id } });
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Obtiene estadísticas de cosechas
   */
  async getStatistics(cycleId?: string) {
    const whereClause = cycleId
      ? { plant: { cycleId } }
      : {};

    const harvests = await this.prisma.harvest.findMany({
      where: whereClause,
      include: {
        products: true,
        plant: {
          include: {
            strain: true,
          },
        },
      },
    });

    // Calcular totales
    const totalWetWeight = harvests.reduce((sum, h) => sum + (h.wetWeight || 0), 0);
    const totalDryWeight = harvests.reduce((sum, h) => sum + (h.dryWeight || 0), 0);
    const totalTrimWeight = harvests.reduce((sum, h) => sum + (h.trimWeight || 0), 0);

    // Productos por tipo
    const allProducts = harvests.flatMap(h => h.products);
    const productsByType = allProducts.reduce((acc, p) => {
      if (!acc[p.type]) {
        acc[p.type] = { count: 0, totalWeight: 0, currentWeight: 0 };
      }
      acc[p.type].count += 1;
      acc[p.type].totalWeight += p.initialWeight;
      acc[p.type].currentWeight += p.currentWeight;
      return acc;
    }, {} as Record<string, { count: number; totalWeight: number; currentWeight: number }>);

    // Productos por ubicación
    const productsByLocation = allProducts.reduce((acc, p) => {
      if (!acc[p.storageLocation]) {
        acc[p.storageLocation] = { count: 0, weight: 0 };
      }
      acc[p.storageLocation].count += 1;
      acc[p.storageLocation].weight += p.currentWeight;
      return acc;
    }, {} as Record<string, { count: number; weight: number }>);

    return {
      totalHarvests: harvests.length,
      totalWetWeight: Math.round(totalWetWeight * 100) / 100,
      totalDryWeight: Math.round(totalDryWeight * 100) / 100,
      totalTrimWeight: Math.round(totalTrimWeight * 100) / 100,
      dryRatio: totalWetWeight > 0 
        ? Math.round((totalDryWeight / totalWetWeight) * 10000) / 100 
        : 0,
      totalProducts: allProducts.length,
      productsByType,
      productsByLocation,
    };
  }
}









