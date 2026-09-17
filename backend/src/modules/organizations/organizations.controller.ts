import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @RequirePermissions('branch.manage')
  findAll() {
    return this.organizationsService.findAll();
  }
}
