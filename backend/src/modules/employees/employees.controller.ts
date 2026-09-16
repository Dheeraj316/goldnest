import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ResetAccessDto, TransferBranchDto, UpdateEmployeeDto } from './dto/update-employee.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions('employee.manage')
  @Audit({ action: 'EMPLOYEE.CREATE', referenceType: 'Employee' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  @RequirePermissions('employee.view')
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.employeesService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions('employee.view')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.employeesService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions('employee.manage')
  @Audit({ action: 'EMPLOYEE.UPDATE', referenceType: 'Employee' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Patch(':id/transfer')
  @RequirePermissions('employee.manage')
  @Audit({ action: 'EMPLOYEE.TRANSFER', referenceType: 'Employee' })
  transferBranch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TransferBranchDto) {
    return this.employeesService.transferBranch(id, dto);
  }

  @Patch(':id/activate')
  @RequirePermissions('employee.manage')
  @Audit({ action: 'EMPLOYEE.ACTIVATE', referenceType: 'Employee' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.activate(id);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('employee.manage')
  @Audit({ action: 'EMPLOYEE.DEACTIVATE', referenceType: 'Employee' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.deactivate(id);
  }

  @Patch(':id/reset-access')
  @RequirePermissions('employee.manage')
  @Audit({ action: 'EMPLOYEE.RESET_ACCESS', referenceType: 'Employee' })
  resetAccess(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetAccessDto) {
    return this.employeesService.resetAccess(id, dto);
  }
}
