import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RiskAlertsService } from './risk-alerts.service';

@Injectable()
export class RiskAlertsScheduler {
  private readonly logger = new Logger(RiskAlertsScheduler.name);

  constructor(private readonly riskAlertsService: RiskAlertsService) {}

  // Runs after the collections sweep (00:30 IST) has finished marking today's overdue loans,
  // so SEVERELY_OVERDUE sees fresh statuses. The scan itself is idempotent.
  @Cron('0 1 * * *', { timeZone: 'Asia/Kolkata' })
  async nightlyScan() {
    try {
      const result = await this.riskAlertsService.scan();
      this.logger.log(`Nightly risk scan: ${JSON.stringify(result)}`);
    } catch (e) {
      this.logger.error(`Nightly risk scan failed: ${(e as Error).message}`);
    }
  }
}
