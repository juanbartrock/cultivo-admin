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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';
import { UpdateSectionLayoutDto } from './dto/layout.dto';

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

  // ============================================
  // PPFD / DLI
  // ============================================

  @Post(':id/ppfd')
  @ApiOperation({ summary: 'Registrar lectura de PPFD para una zona' })
  @ApiResponse({ status: 201, description: 'Lectura registrada' })
  async createPPFDReading(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: { zone: number; ppfdValue: number; lightHeight: number },
  ) {
    return this.locationsService.createPPFDReading(id, data);
  }

  @Get(':id/ppfd/latest')
  @ApiOperation({ summary: 'Obtener últimas lecturas de PPFD por zona' })
  @ApiResponse({ status: 200, description: 'Últimas lecturas por zona' })
  async getLatestPPFDReadings(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.getLatestPPFDReadings(id);
  }

  @Get(':id/ppfd/history')
  @ApiOperation({ summary: 'Obtener historial de lecturas de PPFD' })
  @ApiResponse({ status: 200, description: 'Historial de lecturas' })
  async getPPFDHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('zone') zone?: string,
    @Query('limit') limit?: string,
  ) {
    return this.locationsService.getPPFDHistory(
      id,
      zone ? parseInt(zone, 10) : undefined,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id/dli')
  @ApiOperation({
    summary: 'Calcular DLI teórico',
    description: 'DLI = PPFD × horas de luz × 0.0036',
  })
  @ApiResponse({ status: 200, description: 'DLI calculado' })
  async calculateDLI(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lightHours') lightHours?: string,
  ) {
    return this.locationsService.calculateDLI(
      id,
      lightHours ? parseFloat(lightHours) : 18,
    );
  }

  // ============================================
  // LAYOUT
  // ============================================

  @Get(':id/layout')
  @ApiOperation({ summary: 'Obtener configuración de layout de la sección' })
  @ApiResponse({ status: 200, description: 'Configuración de layout' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async getLayout(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.getSectionLayout(id);
  }

  @Put(':id/layout')
  @ApiOperation({ summary: 'Actualizar configuración de layout de la sección' })
  @ApiResponse({ status: 200, description: 'Layout actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async updateLayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLayoutDto: UpdateSectionLayoutDto,
  ) {
    return this.locationsService.updateSectionLayout(id, updateLayoutDto);
  }
}
