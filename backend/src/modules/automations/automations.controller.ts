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
import { JobProcessorService } from './job-processor.service';
import { ContextBuilderService, SystemCapabilities } from '../ai-assistant/context-builder.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  ExecuteAutomationDto,
} from './dto/automation.dto';
import { GetJobsQueryDto } from './dto/job.dto';
import { AutomationStatus, JobStatus, User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automations')
export class AutomationsController {
  constructor(
    private readonly automationsService: AutomationsService,
    private readonly jobProcessor: JobProcessorService,
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  /**
   * Lista todas las automatizaciones
   * GET /api/automations?sectionId=xxx
   */
  @Get()
  findAll(@Query('sectionId') sectionId?: string) {
    return this.automationsService.findAll(sectionId);
  }

  /**
   * Analiza las capacidades del sistema para automatización
   * Retorna sensores, dispositivos controlables y gaps
   * GET /api/automations/capabilities
   * IMPORTANTE: Esta ruta debe estar ANTES de :id para no ser capturada
   */
  @Get('capabilities')
  @ApiOperation({ summary: 'Analiza capacidades del sistema para automatización' })
  analyzeCapabilities(@CurrentUser() user: User): Promise<SystemCapabilities> {
    return this.contextBuilder.analyzeSystemCapabilities(user.id);
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

  // ============================================
  // ENDPOINTS DE JOB QUEUE
  // ============================================

  /**
   * Lista jobs programados
   * GET /api/automations/jobs?status=PENDING&limit=50
   */
  @Get('jobs')
  @ApiOperation({ summary: 'Lista jobs programados con filtros opcionales' })
  getJobs(@Query() query: GetJobsQueryDto) {
    return this.jobProcessor.getJobs({
      status: query.status,
      limit: query.limit,
    });
  }

  /**
   * Obtiene estadísticas de jobs
   * GET /api/automations/jobs/stats
   */
  @Get('jobs/stats')
  @ApiOperation({ summary: 'Obtiene estadísticas de jobs por estado' })
  getJobStats() {
    return this.jobProcessor.getStats();
  }

  /**
   * Obtiene estado del procesador de jobs
   * GET /api/automations/jobs/processor-status
   */
  @Get('jobs/processor-status')
  @ApiOperation({ summary: 'Obtiene estado del procesador de jobs' })
  getProcessorStatus() {
    return this.jobProcessor.getProcessorStatus();
  }

  /**
   * Obtiene un job por ID
   * GET /api/automations/jobs/:jobId
   */
  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Obtiene un job por su ID' })
  getJobById(@Param('jobId') jobId: string) {
    return this.jobProcessor.getJobById(jobId);
  }

  /**
   * Reintenta un job fallido
   * POST /api/automations/jobs/:jobId/retry
   */
  @Post('jobs/:jobId/retry')
  @ApiOperation({ summary: 'Reintenta un job fallido o muerto' })
  retryJob(@Param('jobId') jobId: string) {
    return this.jobProcessor.retryJob(jobId);
  }

  /**
   * Cancela un job pendiente
   * POST /api/automations/jobs/:jobId/cancel
   */
  @Post('jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancela un job pendiente' })
  cancelJob(@Param('jobId') jobId: string) {
    return this.jobProcessor.cancelJob(jobId);
  }

  // ============================================
  // ENDPOINTS DE PROPUESTAS DE IA
  // ============================================

  /**
   * Lista automatizaciones propuestas por IA pendientes de aprobación
   * GET /api/automations/proposals/pending
   */
  @Get('proposals/pending')
  @ApiOperation({ summary: 'Lista automatizaciones propuestas por IA pendientes de aprobación' })
  getPendingProposals(@Query('sectionId') sectionId?: string) {
    return this.automationsService.getPendingProposals(sectionId);
  }

  /**
   * Aprueba una propuesta de automatización
   * POST /api/automations/proposals/:id/approve
   */
  @Post('proposals/:id/approve')
  @ApiOperation({ summary: 'Aprueba una propuesta de automatización de IA' })
  approveProposal(@Param('id') id: string) {
    return this.automationsService.approveProposal(id);
  }

  /**
   * Rechaza una propuesta de automatización
   * POST /api/automations/proposals/:id/reject
   */
  @Post('proposals/:id/reject')
  @ApiOperation({ summary: 'Rechaza una propuesta de automatización de IA' })
  rejectProposal(@Param('id') id: string) {
    return this.automationsService.rejectProposal(id);
  }

  /**
   * Obtiene el conteo de propuestas pendientes
   * GET /api/automations/proposals/count
   */
  @Get('proposals/count')
  @ApiOperation({ summary: 'Obtiene el conteo de propuestas de IA pendientes' })
  getPendingProposalsCount() {
    return this.automationsService.getPendingProposalsCount();
  }

}





