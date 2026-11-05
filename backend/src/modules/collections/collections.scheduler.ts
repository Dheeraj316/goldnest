import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CollectionsService } from './collections.service';

@Injectable()
export class CollectionsScheduler {
  private readonly logger = new Logger(CollectionsScheduler.name);

  constructor(private readonly collectionsService: CollectionsService) {}

  // Just after local midnight, so "days past due" rolls over with the business
  // day. The sweep is idempotent, so a second instance running it is harmless.
  @Cron('30 0 * * *', { timeZone: 'Asia/Kolkata' })
  async nightlySweep() {
    try {
      const result = await this.collectionsService.runSweep();
      this.logger.log(`Nightly collections sweep: ${JSON.stringify(result)}`);
    } catch (e) {
      this.logger.error(`Nightly collections sweep failed: ${(e as Error).message}`);
    }
  }
}
