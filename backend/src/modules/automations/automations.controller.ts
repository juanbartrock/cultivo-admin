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
  UseGuards,
} from '@nestjs/common';
import { AutomationsService } from './automations.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  ExecuteAutomationDto,
} from './dto/automation.dto';
import { AutomationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) { }

  /**
   * Lista todas las automatizaciones
   * GET /api/automations?sectionId=xxx
   */
  @Get()
  findAll(@Query('sectionId') sectionId?: string) {
    return this.automationsService.findAll(sectionId);
  }

  /**
   * Obtiene una automatización por ID
   * GET /api/automations/:id
   */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.automationsService.findById(id);
  }

  /**
   * Crea una nueva automatización
   * POST /api/automations
   */
  @Post()
  create(@Body() data: CreateAutomationDto) {
    return this.automationsService.create(data);
  }

  /**
   * Actualiza una automatización
   * PUT /api/automations/:id
   */
  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateAutomationDto) {
    return this.automationsService.update(id, data);
  }

  /**
   * Elimina una automatización
   * DELETE /api/automations/:id
   */
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.automationsService.delete(id);
  }

  /**
   * Cambia el estado de una automatización
   * PATCH /api/automations/:id/status
   */
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body('status') status: AutomationStatus,
  ) {
    return this.automationsService.setStatus(id, status);
  }

  /**
   * Evalúa las condiciones de una automatización
   * GET /api/automations/:id/evaluate
   */
  @Get(':id/evaluate')
  evaluateConditions(@Param('id') id: string) {
    return this.automationsService.evaluateConditions(id);
  }

  /**
   * Ejecuta una automatización manualmente
   * POST /api/automations/:id/execute
   */
  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @Body() data: ExecuteAutomationDto,
  ) {
    return this.automationsService.executeActions(id, data.skipConditions);
  }

  /**
   * Obtiene el historial de ejecuciones
   * GET /api/automations/:id/executions?limit=50&from=xxx&to=xxx
   */
  @Get(':id/executions')
  getExecutions(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.automationsService.getExecutions(
      id,
      limit ? parseInt(limit, 10) : 50,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  /**
   * Obtiene estadísticas de efectividad
   * GET /api/automations/:id/effectiveness?days=30
   */
  @Get(':id/effectiveness')
  getEffectiveness(
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    return this.automationsService.getEffectivenessStats(
      id,
      days ? parseInt(days, 10) : 30,
    );
  }
}





