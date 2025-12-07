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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GrowService } from './grow.service';
import { CreatePlantDto, UpdatePlantDto, MovePlantDto } from './dto/plant.dto';

@ApiTags('grow')
@Controller('plants')
export class PlantsController {
  constructor(private readonly growService: GrowService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las plantas' })
  @ApiQuery({
    name: 'cycleId',
    required: false,
    description: 'Filtrar por ciclo',
  })
  @ApiQuery({
    name: 'sectionId',
    required: false,
    description: 'Filtrar por sección',
  })
  @ApiResponse({ status: 200, description: 'Lista de plantas' })
  async findAll(
    @Query('cycleId') cycleId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.growService.findAllPlants(cycleId, sectionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una planta por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la planta con eventos' })
  @ApiResponse({ status: 404, description: 'Planta no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.growService.findPlantById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva planta' })
  @ApiResponse({ status: 201, description: 'Planta creada exitosamente' })
  @ApiResponse({ status: 404, description: 'Genética, ciclo o sección no encontrada' })
  @ApiResponse({ status: 400, description: 'Tag code ya existe' })
  async create(@Body() createPlantDto: CreatePlantDto) {
    return this.growService.createPlant(createPlantDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una planta' })
  @ApiResponse({ status: 200, description: 'Planta actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Planta no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlantDto: UpdatePlantDto,
  ) {
    return this.growService.updatePlant(id, updatePlantDto);
  }

  @Patch(':id/move')
  @ApiOperation({
    summary: 'Mover planta de sección o cambiar etapa',
    description: 'Crea eventos automáticos de transplante o cambio de fotoperiodo',
  })
  @ApiResponse({ status: 200, description: 'Planta movida exitosamente' })
  @ApiResponse({ status: 404, description: 'Planta o sección no encontrada' })
  async move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() movePlantDto: MovePlantDto,
  ) {
    return this.growService.movePlant(id, movePlantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una planta' })
  @ApiResponse({ status: 200, description: 'Planta eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Planta no encontrada' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.growService.deletePlant(id);
  }
}
