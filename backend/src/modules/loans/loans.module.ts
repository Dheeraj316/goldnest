import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';
import { LoanApplicationsController } from './loan-applications.controller';
import { LoansController } from './loans.controller';
import { NumberGeneratorModule } from '../number-generator/number-generator.module';
import { InterestEngineModule } from '../interest-engine/interest-engine.module';

@Module({
  imports: [NumberGeneratorModule, InterestEngineModule],
  controllers: [LoanApplicationsController, LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
