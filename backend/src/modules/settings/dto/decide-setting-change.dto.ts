import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DecideSettingChangeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
