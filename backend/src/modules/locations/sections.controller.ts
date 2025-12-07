import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';

@ApiTags('locations')
@Controller('sections')
export class SectionsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las secciones' })
  @ApiResponse({ status: 200, description: 'Lista de secciones' })
  async findAll() {
    return this.locationsService.findAllSections();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una sección por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la sección' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.findSectionById(id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Dashboard de una sección con dispositivos y plantas' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard con datos de la sección, dispositivos y resumen de plantas',
  })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async getDashboard(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.getSectionDashboard(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva sección' })
  @ApiResponse({ status: 201, description: 'Sección creada exitosamente' })
  async create(@Body() createSectionDto: CreateSectionDto) {
    return this.locationsService.createSection(createSectionDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una sección' })
  @ApiResponse({ status: 200, description: 'Sección actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSectionDto: UpdateSectionDto,
  ) {
    return this.locationsService.updateSection(id, updateSectionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una sección' })
  @ApiResponse({ status: 200, description: 'Sección eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.deleteSection(id);
  }
}
