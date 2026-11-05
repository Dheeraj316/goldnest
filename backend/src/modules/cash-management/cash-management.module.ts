import { Module } from '@nestjs/common';
import { CashManagementController } from './cash-management.controller';
import { CashManagementService } from './cash-management.service';

@Module({
  controllers: [CashManagementController],
  providers: [CashManagementService],
})
export class CashManagementModule {}
