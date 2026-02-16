import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AutomationStatus } from '@prisma/client';
import {
  CreateAutomationDto,
  ExecuteAutomationDto,
  UpdateAutomationDto,
} from './dto/automation.dto';
import {
  GetEffectivenessQueryDto,
  GetExecutionsQueryDto,
  GetJobsQueryDto,
} from './dto/job.dto';
import { AutomationsService } from './automations.service';
import { JobProcessorService } from './job-processor.service';
import {
  ContextBuilderService,
  SystemCapabilities,
} from '../ai-assistant/context-builder.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('automations')
@ApiBearerAuth()
@Controller('automations')
export class AutomationsController {
  constructor(
    private readonly automationsService: AutomationsService,
    private readonly jobProcessor: JobProcessorService,
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  @Get('capabilities')
  @ApiOperation({ summary: 'Analiza capacidades del sistema para automatización' })
  analyzeCapabilities(@CurrentUser() user: AuthenticatedUser): Promise<SystemCapabilities> {
    return this.contextBuilder.analyzeSystemCapabilities(user.id);
  }

  // ============================================
  // ENDPOINTS DE JOB QUEUE
  // ============================================

  @Get('jobs')
  @ApiOperation({ summary: 'Lista jobs programados con filtros opcionales' })
  getJobs(@Query() query: GetJobsQueryDto) {
    return this.jobProcessor.getJobs({
      status: query.status,
      limit: query.limit,
    });
  }

  @Get('jobs/stats')
  @ApiOperation({ summary: 'Obtiene estadísticas de jobs por estado' })
  getJobStats() {
    return this.jobProcessor.getStats();
  }

  @Get('jobs/processor-status')
  @ApiOperation({ summary: 'Obtiene estado del procesador de jobs' })
  getProcessorStatus() {
    return this.jobProcessor.getProcessorStatus();
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Obtiene un job por su ID' })
  getJobById(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.jobProcessor.getJobById(jobId);
  }

  @Post('jobs/:jobId/retry')
  @ApiOperation({ summary: 'Reintenta un job fallido o muerto' })
  retryJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.jobProcessor.retryJob(jobId);
  }

  @Post('jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancela un job pendiente' })
  cancelJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.jobProcessor.cancelJob(jobId);
  }

  // ============================================
  // ENDPOINTS DE PROPUESTAS DE IA
  // ============================================

  @Get('proposals/pending')
  @ApiOperation({ summary: 'Lista automatizaciones propuestas por IA pendientes de aprobación' })
  getPendingProposals(@Query('sectionId') sectionId?: string) {
    return this.automationsService.getPendingProposals(sectionId);
  }

  @Post('proposals/:id/approve')
  @ApiOperation({ summary: 'Aprueba una propuesta de automatización de IA' })
  approveProposal(@Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.approveProposal(id);
  }

  @Post('proposals/:id/reject')
  @ApiOperation({ summary: 'Rechaza una propuesta de automatización de IA' })
  rejectProposal(@Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.rejectProposal(id);
  }

  @Get('proposals/count')
  @ApiOperation({ summary: 'Obtiene el conteo de propuestas de IA pendientes' })
  getPendingProposalsCount() {
    return this.automationsService.getPendingProposalsCount();
  }

  // ============================================
  // CRUD AUTOMATIZACIONES
  // ============================================

  @Get()
  findAll(@Query('sectionId') sectionId?: string) {
    return this.automationsService.findAll(sectionId);
  }

  @Post()
  create(@Body() data: CreateAutomationDto) {
    return this.automationsService.create(data);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.findById(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateAutomationDto) {
    return this.automationsService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.delete(id);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: AutomationStatus,
  ) {
    return this.automationsService.setStatus(id, status);
  }

  @Get(':id/evaluate')
  evaluateConditions(@Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.evaluateConditions(id);
  }

  @Post(':id/execute')
  execute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: ExecuteAutomationDto,
  ) {
    return this.automationsService.executeActions(id, data.skipConditions);
  }

  @Get(':id/executions')
  getExecutions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetExecutionsQueryDto,
  ) {
    return this.automationsService.getExecutions(
      id,
      query.limit ?? 50,
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  @Get(':id/effectiveness')
  getEffectiveness(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetEffectivenessQueryDto,
  ) {
    return this.automationsService.getEffectivenessStats(id, query.days ?? 30);
  }
}
