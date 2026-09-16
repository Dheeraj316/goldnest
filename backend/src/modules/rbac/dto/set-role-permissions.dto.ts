import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  @ApiProperty({ type: [String], example: ['loan.approve', 'collateral.release'] })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];
}
