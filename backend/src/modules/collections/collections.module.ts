import { Module } from '@nestjs/common';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { CollectionsScheduler } from './collections.scheduler';
import { NumberGeneratorModule } from '../number-generator/number-generator.module';
import { InterestEngineModule } from '../interest-engine/interest-engine.module';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [NumberGeneratorModule, InterestEngineModule, LoansModule],
  controllers: [CollectionsController],
  providers: [CollectionsService, CollectionsScheduler],
})
export class CollectionsModule {}
