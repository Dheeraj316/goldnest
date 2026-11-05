import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { NumberGeneratorModule } from '../number-generator/number-generator.module';

@Module({
  imports: [NumberGeneratorModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
