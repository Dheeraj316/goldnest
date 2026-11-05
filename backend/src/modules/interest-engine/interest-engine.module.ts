import { Module } from '@nestjs/common';
import { InterestEngineService } from './interest-engine.service';

@Module({
  providers: [InterestEngineService],
  exports: [InterestEngineService],
})
export class InterestEngineModule {}
