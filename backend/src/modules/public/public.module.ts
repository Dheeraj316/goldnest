import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { EnquiriesController } from './enquiries.controller';
import { PublicService } from './public.service';

@Module({
  controllers: [PublicController, EnquiriesController],
  providers: [PublicService],
})
export class PublicModule {}
