import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class UpdateEmployeeDto extends PartialType(OmitType(CreateEmployeeDto, ['initialPassword'] as const)) {
  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}

export class TransferBranchDto {
  @ApiProperty()
  @IsUUID()
  branchId: string;
}

export class ResetAccessDto {
  @ApiPropertyOptional({ description: 'If omitted, a random temporary password is generated and returned once.' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
