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
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@ApiTags('locations')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las salas' })
  @ApiResponse({ status: 200, description: 'Lista de salas con sus secciones' })
  async findAll() {
    return this.locationsService.findAllRooms();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una sala por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la sala' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.findRoomById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva sala' })
  @ApiResponse({ status: 201, description: 'Sala creada exitosamente' })
  async create(@Body() createRoomDto: CreateRoomDto) {
    return this.locationsService.createRoom(createRoomDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una sala' })
  @ApiResponse({ status: 200, description: 'Sala actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.locationsService.updateRoom(id, updateRoomDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una sala' })
  @ApiResponse({ status: 200, description: 'Sala eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.deleteRoom(id);
  }

  @Get(':id/sections')
  @ApiOperation({ summary: 'Listar secciones de una sala' })
  @ApiResponse({ status: 200, description: 'Lista de secciones de la sala' })
  @ApiResponse({ status: 404, description: 'Sala no encontrada' })
  async getSections(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.getRoomSections(id);
  }
}
