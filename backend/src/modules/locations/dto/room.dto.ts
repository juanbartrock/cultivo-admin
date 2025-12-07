import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    description: 'Nombre de la sala',
    example: 'Habitación Cultivo',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la sala',
    example: 'Sala principal de cultivo indoor',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
