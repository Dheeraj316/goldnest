import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { NumberGeneratorModule } from '../number-generator/number-generator.module';

@Module({
  imports: [NumberGeneratorModule],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
