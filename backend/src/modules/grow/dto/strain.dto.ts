import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { StrainType } from '@prisma/client';

export class CreateStrainDto {
  @ApiProperty({
    description: 'Nombre de la genética',
    example: 'Blue Dream',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Banco de semillas / breeder',
    example: 'Humboldt Seeds',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  breeder?: string;

  @ApiProperty({
    description: 'Tipo de genética',
    enum: StrainType,
    example: StrainType.HYBRID,
  })
  @IsEnum(StrainType)
  type: StrainType;

  @ApiPropertyOptional({
    description: 'Días de floración esperados',
    example: 65,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  floweringDaysExpected?: number;

  @ApiPropertyOptional({
    description: 'Descripción de la genética',
    example: 'Híbrido sativa dominante con notas de berry',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}

export class UpdateStrainDto extends PartialType(CreateStrainDto) {}
