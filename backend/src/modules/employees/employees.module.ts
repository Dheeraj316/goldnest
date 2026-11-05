import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { NumberGeneratorModule } from '../number-generator/number-generator.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [NumberGeneratorModule, RbacModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
