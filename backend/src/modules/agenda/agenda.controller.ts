import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AgendaService } from './agenda.service';
import {
  CompletePreventionDto,
  CompleteTaskDto,
  CreateTaskDto,
  RegisterWateringDto,
  UpdateTaskDto,
} from './dto/agenda.dto';

@ApiTags('agenda')
@ApiBearerAuth()
@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get('today')
  @ApiOperation({ summary: 'Bloque "Hoy": períodos de luz, tareas de planes y manuales, próximos hitos' })
  @ApiResponse({ status: 200, description: 'Una entrada por carpa con ciclo activo' })
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.agendaService.today(user?.id);
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Crear una tarea manual' })
  createTask(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.agendaService.createTask(dto, user?.id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Editar, omitir o reabrir una tarea pendiente' })
  updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agendaService.updateTask(id, dto, user?.id);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Borrar una tarea' })
  deleteTask(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.agendaService.deleteTask(id, user?.id);
  }

  @Post('tasks/:id/complete')
  @ApiOperation({ summary: 'Marcar hecha; con eventType escribe el evento en la bitácora' })
  completeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agendaService.completeTask(id, dto, user?.id);
  }

  @Post('watering')
  @ApiOperation({ summary: 'Registrar un riego: un evento RIEGO por planta' })
  registerWatering(@Body() dto: RegisterWateringDto, @CurrentUser() user: AuthenticatedUser) {
    return this.agendaService.registerWatering(dto, user?.id);
  }

  @Post('prevention/complete')
  @ApiOperation({ summary: 'Registrar la aplicación del preventivo de hoy como NOTA en sus plantas' })
  completePrevention(@Body() dto: CompletePreventionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.agendaService.completePrevention(dto, user?.id);
  }
}
