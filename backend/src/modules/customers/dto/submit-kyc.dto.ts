import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

const DOC_TYPES = ['PAN', 'AADHAAR', 'ADDRESS_PROOF', 'OTHER'] as const;

export class SubmitKycDto {
  @ApiProperty({ enum: DOC_TYPES })
  @IsIn(DOC_TYPES)
  docType: (typeof DOC_TYPES)[number];

  @ApiProperty({ description: 'Raw identity number — masked before storage, never persisted in full (spec #13, #69)' })
  @IsString()
  rawNumber: string;
}
