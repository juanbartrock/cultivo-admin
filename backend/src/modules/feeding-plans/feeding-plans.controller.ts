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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FeedingPlansService } from './feeding-plans.service';
import {
  ImportFeedingPlanDto,
  CreateFeedingPlanDto,
  UpdateFeedingPlanDto,
  AssignFeedingPlanDto,
  AddWeekDto,
} from './dto/feeding-plan.dto';
import { PlantStage } from '@prisma/client';

@ApiTags('feeding-plans')
@Controller('feeding-plans')
export class FeedingPlansController {
  constructor(private readonly feedingPlansService: FeedingPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los planes de alimentación' })
  @ApiQuery({
    name: 'stage',
    required: false,
    enum: PlantStage,
    description: 'Filtrar por etapa',
  })
  @ApiResponse({ status: 200, description: 'Lista de planes de alimentación' })
  async findAll(@Query('stage') stage?: PlantStage) {
    return this.feedingPlansService.findAll(stage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un plan de alimentación por ID' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del plan con semanas y plantas asignadas',
  })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.feedingPlansService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo plan de alimentación (vacío)' })
  @ApiResponse({ status: 201, description: 'Plan creado exitosamente' })
  async create(@Body() createDto: CreateFeedingPlanDto) {
    return this.feedingPlansService.create(createDto);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Importar plan de alimentación desde JSON',
    description: 'Crea un plan completo con todas sus semanas',
  })
  @ApiResponse({ status: 201, description: 'Plan importado exitosamente' })
  async import(@Body() importDto: ImportFeedingPlanDto) {
    return this.feedingPlansService.import(importDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un plan de alimentación' })
  @ApiResponse({ status: 200, description: 'Plan actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFeedingPlanDto,
  ) {
    return this.feedingPlansService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un plan de alimentación' })
  @ApiResponse({ status: 200, description: 'Plan eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar plan con plantas asignadas',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.feedingPlansService.delete(id);
  }

  // ============================================
  // WEEKS
  // ============================================

  @Post(':id/weeks')
  @ApiOperation({ summary: 'Agregar o actualizar semana en un plan' })
  @ApiResponse({
    status: 201,
    description: 'Semana agregada/actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async addWeek(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() weekDto: AddWeekDto,
  ) {
    return this.feedingPlansService.addOrUpdateWeek(id, weekDto);
  }

  @Delete(':id/weeks/:weekNumber')
  @ApiOperation({ summary: 'Eliminar una semana de un plan' })
  @ApiParam({ name: 'weekNumber', description: 'Número de semana a eliminar' })
  @ApiResponse({ status: 200, description: 'Semana eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Plan o semana no encontrada' })
  async removeWeek(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
  ) {
    return this.feedingPlansService.deleteWeek(id, weekNumber);
  }
}

// Controller separado para endpoints de sección
@ApiTags('sections')
@Controller('sections')
export class SectionFeedingPlansController {
  constructor(private readonly feedingPlansService: FeedingPlansService) {}

  @Get(':id/feeding-plans')
  @ApiOperation({
    summary: 'Obtener planes de alimentación de una sección',
    description:
      'Retorna todas las plantas de la sección con sus planes y semana actual/anterior/siguiente',
  })
  @ApiResponse({
    status: 200,
    description: 'Planes de alimentación de la sección con info de semanas',
  })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async getSectionFeedingPlans(@Param('id', ParseUUIDPipe) id: string) {
    return this.feedingPlansService.getSectionFeedingPlans(id);
  }
}

// Controller separado para asignar planes a plantas
@ApiTags('plants')
@Controller('plants')
export class PlantFeedingPlansController {
  constructor(private readonly feedingPlansService: FeedingPlansService) {}

  @Post(':id/feeding-plan')
  @ApiOperation({ summary: 'Asignar plan de alimentación a una planta' })
  @ApiResponse({ status: 201, description: 'Plan asignado exitosamente' })
  @ApiResponse({ status: 404, description: 'Planta o plan no encontrado' })
  @ApiResponse({
    status: 400,
    description: 'La etapa del plan no coincide con la planta',
  })
  async assignPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignDto: AssignFeedingPlanDto,
  ) {
    return this.feedingPlansService.assignToPlant(id, assignDto);
  }

  @Delete(':id/feeding-plan/:feedingPlanId')
  @ApiOperation({ summary: 'Desasignar plan de alimentación de una planta' })
  @ApiResponse({ status: 200, description: 'Plan desasignado exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  async unassignPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('feedingPlanId', ParseUUIDPipe) feedingPlanId: string,
  ) {
    return this.feedingPlansService.unassignFromPlant(id, feedingPlanId);
  }
}
