import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { LoansModule } from '../loans/loans.module';
import { NumberGeneratorModule } from '../number-generator/number-generator.module';
import { InterestEngineModule } from '../interest-engine/interest-engine.module';

@Module({
  imports: [LoansModule, NumberGeneratorModule, InterestEngineModule],
  controllers: [AuctionsController],
  providers: [AuctionsService],
})
export class AuctionsModule {}
