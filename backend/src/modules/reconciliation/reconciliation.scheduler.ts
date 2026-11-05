import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReconciliationService } from './reconciliation.service';

@Injectable()
export class ReconciliationScheduler {
  private readonly logger = new Logger(ReconciliationScheduler.name);

  constructor(private readonly reconciliationService: ReconciliationService) {}

  // Sweeps for straightforward matches every night so the manual queue only ever holds the
  // genuinely ambiguous or missing ones. Idempotent — see autoMatchAll().
  @Cron('30 1 * * *', { timeZone: 'Asia/Kolkata' })
  async nightlyAutoMatch() {
    try {
      const result = await this.reconciliationService.autoMatchAll();
      this.logger.log(`Nightly reconciliation auto-match: ${JSON.stringify(result)}`);
    } catch (e) {
      this.logger.error(`Nightly reconciliation auto-match failed: ${(e as Error).message}`);
    }
  }
}
