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
import { GrowService } from './grow.service';
import { CreateStrainDto, UpdateStrainDto } from './dto/strain.dto';

@ApiTags('grow')
@Controller('strains')
export class StrainsController {
  constructor(private readonly growService: GrowService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las genéticas' })
  @ApiResponse({ status: 200, description: 'Lista de genéticas' })
  async findAll() {
    return this.growService.findAllStrains();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una genética por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la genética' })
  @ApiResponse({ status: 404, description: 'Genética no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.growService.findStrainById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva genética' })
  @ApiResponse({ status: 201, description: 'Genética creada exitosamente' })
  async create(@Body() createStrainDto: CreateStrainDto) {
    return this.growService.createStrain(createStrainDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una genética' })
  @ApiResponse({ status: 200, description: 'Genética actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Genética no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStrainDto: UpdateStrainDto,
  ) {
    return this.growService.updateStrain(id, updateStrainDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una genética' })
  @ApiResponse({ status: 200, description: 'Genética eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Genética no encontrada' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar, tiene plantas asociadas' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.growService.deleteStrain(id);
  }
}
