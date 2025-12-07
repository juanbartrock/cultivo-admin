import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import {
  CreateWaterEventDto,
  CreateNoteEventDto,
  CreatePhotoEventDto,
  CreateEnvironmentEventDto,
} from './dto/event.dto';
import { EventType } from '@prisma/client';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos con filtros opcionales' })
  @ApiQuery({ name: 'plantId', required: false })
  @ApiQuery({ name: 'cycleId', required: false })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: EventType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de eventos' })
  async findAll(
    @Query('plantId') plantId?: string,
    @Query('cycleId') cycleId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('type') type?: EventType,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.findAll({
      plantId,
      cycleId,
      sectionId,
      type,
      limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de eventos' })
  @ApiQuery({ name: 'cycleId', required: false })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiResponse({ status: 200, description: 'Estadísticas de eventos por tipo' })
  async getStats(
    @Query('cycleId') cycleId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.eventsService.getStats({ cycleId, sectionId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un evento por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del evento' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findById(id);
  }

  @Post('water')
  @ApiOperation({ summary: 'Registrar evento de riego' })
  @ApiResponse({ status: 201, description: 'Evento de riego creado' })
  async createWaterEvent(@Body() dto: CreateWaterEventDto) {
    return this.eventsService.createWaterEvent(dto);
  }

  @Post('note')
  @ApiOperation({ summary: 'Crear nota de texto' })
  @ApiResponse({ status: 201, description: 'Nota creada' })
  async createNoteEvent(@Body() dto: CreateNoteEventDto) {
    return this.eventsService.createNoteEvent(dto);
  }

  @Post('photo')
  @ApiOperation({ summary: 'Subir foto con evento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (max 10MB)',
        },
        plantId: { type: 'string', format: 'uuid' },
        cycleId: { type: 'string', format: 'uuid' },
        sectionId: { type: 'string', format: 'uuid' },
        caption: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Foto subida y evento creado' })
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
  async createPhotoEvent(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: CreatePhotoEventDto,
  ) {
    return this.eventsService.createPhotoEvent(dto, file);
  }

  @Post('environment')
  @ApiOperation({ summary: 'Registrar parámetros ambientales' })
  @ApiResponse({ status: 201, description: 'Parámetros ambientales registrados' })
  async createEnvironmentEvent(@Body() dto: CreateEnvironmentEventDto) {
    return this.eventsService.createEnvironmentEvent(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un evento' })
  @ApiResponse({ status: 200, description: 'Evento eliminado' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.deleteEvent(id);
  }
}
