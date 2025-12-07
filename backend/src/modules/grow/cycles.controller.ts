import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GrowService } from './grow.service';
import { CreateCycleDto, UpdateCycleDto } from './dto/cycle.dto';
import { CycleStatus } from '@prisma/client';

@ApiTags('grow')
@Controller('cycles')
export class CyclesController {
  constructor(private readonly growService: GrowService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los ciclos/seguimientos' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CycleStatus,
    description: 'Filtrar por estado',
  })
  @ApiResponse({ status: 200, description: 'Lista de ciclos' })
  async findAll(@Query('status') status?: CycleStatus) {
    return this.growService.findAllCycles(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle completo de un ciclo' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del ciclo con plantas, eventos y resumen',
  })
  @ApiResponse({ status: 404, description: 'Ciclo no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.growService.findCycleById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo ciclo/seguimiento' })
  @ApiResponse({ status: 201, description: 'Ciclo creado exitosamente' })
  async create(@Body() createCycleDto: CreateCycleDto) {
    return this.growService.createCycle(createCycleDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un ciclo' })
  @ApiResponse({ status: 200, description: 'Ciclo actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Ciclo no encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCycleDto: UpdateCycleDto,
  ) {
    return this.growService.updateCycle(id, updateCycleDto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Marcar un ciclo como completado' })
  @ApiResponse({ status: 200, description: 'Ciclo marcado como completado' })
  @ApiResponse({ status: 404, description: 'Ciclo no encontrado' })
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.growService.completeCycle(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un ciclo' })
  @ApiResponse({ status: 200, description: 'Ciclo eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Ciclo no encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.growService.deleteCycle(id);
  }
}
