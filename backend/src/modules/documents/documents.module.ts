import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { LoansModule } from '../loans/loans.module';
import { InterestEngineModule } from '../interest-engine/interest-engine.module';

@Module({
  imports: [LoansModule, InterestEngineModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
