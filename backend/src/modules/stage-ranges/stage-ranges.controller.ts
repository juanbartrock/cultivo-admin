import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RangeStage, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PatchStageRangeDto, UpdateStageRangeDto } from './dto/stage-range.dto';
import { NumericBodyInterceptor } from './numeric-body.interceptor';
import { StageRangesService } from './stage-ranges.service';

@ApiTags('stage-ranges')
@ApiBearerAuth()
@Controller('stage-ranges')
export class StageRangesController {
  constructor(private readonly stageRangesService: StageRangesService) {}

  @Get()
  @ApiOperation({ summary: 'Rangos de lecturas por etapa (cualquier usuario autenticado)' })
  @ApiResponse({ status: 200, description: 'Las 7 filas: DEFAULT y una por etapa' })
  async findAll() {
    return this.stageRangesService.findAll();
  }

  @Put(':stage')
  @UseGuards(RolesGuard)
  @UseInterceptors(NumericBodyInterceptor)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reemplazar los rangos de una etapa (solo admin)' })
  @ApiParam({ name: 'stage', enum: RangeStage })
  @ApiResponse({ status: 200, description: 'Rangos actualizados' })
  @ApiResponse({ status: 400, description: 'Rangos incoherentes' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  async update(
    @Param('stage', new ParseEnumPipe(RangeStage)) stage: RangeStage,
    @Body() data: UpdateStageRangeDto,
  ) {
    return this.stageRangesService.update(stage, data);
  }

  @Patch(':stage')
  @UseGuards(RolesGuard)
  @UseInterceptors(NumericBodyInterceptor)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar algunos rangos de una etapa (solo admin)' })
  @ApiParam({ name: 'stage', enum: RangeStage })
  @ApiResponse({ status: 200, description: 'Rangos actualizados' })
  @ApiResponse({ status: 400, description: 'Rangos incoherentes' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  async patch(
    @Param('stage', new ParseEnumPipe(RangeStage)) stage: RangeStage,
    @Body() data: PatchStageRangeDto,
  ) {
    return this.stageRangesService.patch(stage, data);
  }
}
