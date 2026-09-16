import { Module } from '@nestjs/common';
import { NumberGeneratorService } from './number-generator.service';

@Module({
  providers: [NumberGeneratorService],
  exports: [NumberGeneratorService],
})
export class NumberGeneratorModule {}
