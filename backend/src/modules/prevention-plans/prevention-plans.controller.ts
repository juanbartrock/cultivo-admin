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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PreventionPlansService } from './prevention-plans.service';
import {
  ImportPreventionPlanDto,
  CreatePreventionPlanDto,
  UpdatePreventionPlanDto,
  AssignPreventionPlanDto,
  AddApplicationDto,
} from './dto/prevention-plan.dto';
import { PlantStage } from '@prisma/client';

@ApiTags('prevention-plans')
@Controller('prevention-plans')
export class PreventionPlansController {
  constructor(private readonly preventionPlansService: PreventionPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los planes de prevención' })
  @ApiQuery({
    name: 'stage',
    required: false,
    enum: PlantStage,
    description: 'Filtrar por etapa',
  })
  @ApiResponse({ status: 200, description: 'Lista de planes de prevención' })
  async findAll(@Query('stage') stage?: PlantStage) {
    return this.preventionPlansService.findAll(stage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un plan de prevención por ID' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del plan con aplicaciones y plantas asignadas',
  })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.preventionPlansService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo plan de prevención (vacío)' })
  @ApiResponse({ status: 201, description: 'Plan creado exitosamente' })
  async create(@Body() createDto: CreatePreventionPlanDto) {
    return this.preventionPlansService.create(createDto);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Importar plan de prevención desde JSON',
    description: 'Crea un plan completo con todas sus aplicaciones',
  })
  @ApiResponse({ status: 201, description: 'Plan importado exitosamente' })
  async import(@Body() importDto: ImportPreventionPlanDto) {
    return this.preventionPlansService.import(importDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un plan de prevención' })
  @ApiResponse({ status: 200, description: 'Plan actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePreventionPlanDto,
  ) {
    return this.preventionPlansService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un plan de prevención' })
  @ApiResponse({ status: 200, description: 'Plan eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar plan con plantas asignadas',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.preventionPlansService.delete(id);
  }

  // ============================================
  // APPLICATIONS
  // ============================================

  @Post(':id/applications')
  @ApiOperation({ summary: 'Agregar o actualizar aplicación en un plan' })
  @ApiResponse({
    status: 201,
    description: 'Aplicación agregada/actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async addApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() applicationDto: AddApplicationDto,
  ) {
    return this.preventionPlansService.addOrUpdateApplication(id, applicationDto);
  }

  @Delete(':id/applications/:dayNumber')
  @ApiOperation({ summary: 'Eliminar una aplicación de un plan' })
  @ApiParam({ name: 'dayNumber', description: 'Día de aplicación a eliminar' })
  @ApiResponse({ status: 200, description: 'Aplicación eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Plan o aplicación no encontrada' })
  async removeApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('dayNumber', ParseIntPipe) dayNumber: number,
  ) {
    return this.preventionPlansService.deleteApplication(id, dayNumber);
  }
}

// Controller separado para endpoints de sección
@ApiTags('sections')
@Controller('sections')
export class SectionPreventionPlansController {
  constructor(private readonly preventionPlansService: PreventionPlansService) {}

  @Get(':id/prevention-plans')
  @ApiOperation({
    summary: 'Obtener planes de prevención de una sección',
    description:
      'Retorna todas las plantas de la sección con sus planes y día actual/anterior/siguiente',
  })
  @ApiResponse({
    status: 200,
    description: 'Planes de prevención de la sección con info de días',
  })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async getSectionPreventionPlans(@Param('id', ParseUUIDPipe) id: string) {
    return this.preventionPlansService.getSectionPreventionPlans(id);
  }
}

// Controller separado para asignar planes a plantas
@ApiTags('plants')
@Controller('plants')
export class PlantPreventionPlansController {
  constructor(private readonly preventionPlansService: PreventionPlansService) {}

  @Post(':id/prevention-plan')
  @ApiOperation({ summary: 'Asignar plan de prevención a una planta' })
  @ApiResponse({ status: 201, description: 'Plan asignado exitosamente' })
  @ApiResponse({ status: 404, description: 'Planta o plan no encontrado' })
  @ApiResponse({
    status: 400,
    description: 'La etapa del plan no coincide con la planta',
  })
  async assignPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignDto: AssignPreventionPlanDto,
  ) {
    return this.preventionPlansService.assignToPlant(id, assignDto);
  }

  @Delete(':id/prevention-plan/:preventionPlanId')
  @ApiOperation({ summary: 'Desasignar plan de prevención de una planta' })
  @ApiResponse({ status: 200, description: 'Plan desasignado exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  async unassignPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('preventionPlanId', ParseUUIDPipe) preventionPlanId: string,
  ) {
    return this.preventionPlansService.unassignFromPlant(id, preventionPlanId);
  }
}
