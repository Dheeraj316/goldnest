import { Module } from '@nestjs/common';
import { RiskAlertsController } from './risk-alerts.controller';
import { RiskAlertsService } from './risk-alerts.service';
import { RiskAlertsScheduler } from './risk-alerts.scheduler';

@Module({
  controllers: [RiskAlertsController],
  providers: [RiskAlertsService, RiskAlertsScheduler],
  exports: [RiskAlertsService],
})
export class RiskAlertsModule {}
