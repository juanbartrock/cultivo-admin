import { Body, Controller, Get, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BooleanBodyInterceptor } from '../../common/interceptors/boolean-body.interceptor';
import { UpdateReadingsSettingsDto } from './dto/readings-settings.dto';
import { ReadingsSettingsService } from './readings-settings.service';

@ApiTags('readings-settings')
@ApiBearerAuth()
@Controller('readings-settings')
export class ReadingsSettingsController {
  constructor(private readonly readingsSettingsService: ReadingsSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Interruptor general de lecturas (cualquier usuario autenticado)' })
  @ApiResponse({ status: 200, description: 'Estado del interruptor' })
  async find() {
    return this.readingsSettingsService.get();
  }

  @Put()
  @UseGuards(RolesGuard)
  @UseInterceptors(BooleanBodyInterceptor('sensorsEnabled'))
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activar o desactivar las lecturas de sensores (solo admin)' })
  @ApiResponse({ status: 200, description: 'Interruptor actualizado' })
  @ApiResponse({ status: 400, description: 'sensorsEnabled tiene que ser booleano' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  async update(@Body() data: UpdateReadingsSettingsDto) {
    return this.readingsSettingsService.update(data);
  }
}
