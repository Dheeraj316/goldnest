import { Module } from '@nestjs/common';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationScheduler } from './reconciliation.scheduler';

@Module({
  controllers: [ReconciliationController],
  providers: [ReconciliationService, ReconciliationScheduler],
})
export class ReconciliationModule {}
