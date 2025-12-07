import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, MaxLength } from 'class-validator';
import { CycleStatus } from '@prisma/client';

export class CreateCycleDto {
  @ApiProperty({
    description: 'Nombre del ciclo/seguimiento',
    example: 'Invierno 2025',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Fecha de inicio del ciclo',
    example: '2025-01-15',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del ciclo',
    example: '2025-05-15',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Notas del ciclo',
    example: 'Primer cultivo de interior del año',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateCycleDto extends PartialType(CreateCycleDto) {
  @ApiPropertyOptional({
    description: 'Estado del ciclo',
    enum: CycleStatus,
  })
  @IsEnum(CycleStatus)
  @IsOptional()
  status?: CycleStatus;
}
