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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las salas del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de salas con sus secciones' })
  async findAll(@CurrentUser() user: User) {
    return this.locationsService.findAllRooms(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una sala por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la sala' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.locationsService.findRoomById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva sala' })
  @ApiResponse({ status: 201, description: 'Sala creada exitosamente' })
  async create(
    @Body() createRoomDto: CreateRoomDto,
    @CurrentUser() user: User,
  ) {
    return this.locationsService.createRoom(createRoomDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una sala' })
  @ApiResponse({ status: 200, description: 'Sala actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @CurrentUser() user: User,
  ) {
    return this.locationsService.updateRoom(id, updateRoomDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una sala' })
  @ApiResponse({ status: 200, description: 'Sala eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.locationsService.deleteRoom(id, user.id);
  }

  @Get(':id/sections')
  @ApiOperation({ summary: 'Listar secciones de una sala' })
  @ApiResponse({ status: 200, description: 'Lista de secciones de la sala' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async getSections(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.locationsService.getRoomSections(id, user.id);
  }
}
