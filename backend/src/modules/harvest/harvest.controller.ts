import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HarvestService } from './harvest.service';
import {
  CreateHarvestDto,
  UpdateHarvestDto,
  CreateHarvestProductDto,
  UpdateHarvestProductDto,
  ExtractMaterialDto,
} from './dto/harvest.dto';
import { HarvestProductType } from '@prisma/client';

@ApiTags('harvest')
@Controller('harvests')
export class HarvestController {
  constructor(private readonly harvestService: HarvestService) {}

  // ============================================
  // HARVESTS
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Listar todas las cosechas' })
  @ApiResponse({ status: 200, description: 'Lista de cosechas' })
  async findAllHarvests(@Query('plantId') plantId?: string) {
    return this.harvestService.findAllHarvests(plantId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtener estadísticas de cosechas' })
  @ApiResponse({ status: 200, description: 'Estadísticas' })
  async getStatistics(@Query('cycleId') cycleId?: string) {
    return this.harvestService.getStatistics(cycleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cosecha por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la cosecha' })
  @ApiResponse({ status: 404, description: 'Cosecha no encontrada' })
  async findHarvestById(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findHarvestById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva cosecha' })
  @ApiResponse({ status: 201, description: 'Cosecha creada' })
  async createHarvest(@Body() data: CreateHarvestDto) {
    return this.harvestService.createHarvest(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una cosecha' })
  @ApiResponse({ status: 200, description: 'Cosecha actualizada' })
  @ApiResponse({ status: 404, description: 'Cosecha no encontrada' })
  async updateHarvest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateHarvestDto,
  ) {
    return this.harvestService.updateHarvest(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una cosecha' })
  @ApiResponse({ status: 200, description: 'Cosecha eliminada' })
  @ApiResponse({ status: 404, description: 'Cosecha no encontrada' })
  async deleteHarvest(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.deleteHarvest(id);
  }

  // ============================================
  // HARVEST PRODUCTS
  // ============================================

  @Get('products/all')
  @ApiOperation({ summary: 'Listar todos los productos de cosecha' })
  @ApiResponse({ status: 200, description: 'Lista de productos' })
  async findAllProducts(
    @Query('harvestId') harvestId?: string,
    @Query('type') type?: HarvestProductType,
  ) {
    return this.harvestService.findAllProducts(harvestId, type);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del producto' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async findProductById(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.findProductById(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Crear un producto de cosecha' })
  @ApiResponse({ status: 201, description: 'Producto creado' })
  async createProduct(@Body() data: CreateHarvestProductDto) {
    return this.harvestService.createProduct(data);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Actualizar un producto' })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateHarvestProductDto,
  ) {
    return this.harvestService.updateProduct(id, data);
  }

  @Patch('products/:id/extract')
  @ApiOperation({
    summary: 'Extraer material de un producto',
    description: 'Reduce el peso actual del producto',
  })
  @ApiResponse({ status: 200, description: 'Material extraído' })
  @ApiResponse({ status: 400, description: 'Cantidad inválida' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async extractMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: ExtractMaterialDto,
  ) {
    return this.harvestService.extractMaterial(id, data);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Eliminar un producto' })
  @ApiResponse({ status: 200, description: 'Producto eliminado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.harvestService.deleteProduct(id);
  }
}




