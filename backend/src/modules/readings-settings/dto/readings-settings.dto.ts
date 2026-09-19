import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateReadingsSettingsDto {
  @ApiProperty({
    description:
      'Interruptor general de lecturas de sensores. En false ningún SENSOR se consulta al conector.',
    example: false,
  })
  @IsBoolean()
  sensorsEnabled: boolean;
}
