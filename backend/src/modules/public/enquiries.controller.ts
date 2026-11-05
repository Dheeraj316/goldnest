import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { UpdateEnquiryStatusDto } from './dto/update-enquiry-status.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

// Staff-facing (authenticated) side of the leads captured by PublicController
// — the other half of "the website is linked through the DB": what a visitor
// submits here is what a branch/support employee sees and actions.
@ApiTags('enquiries')
@ApiBearerAuth()
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly publicService: PublicService) {}

  @Get()
  @RequirePermissions('enquiry.view')
  list(@Query('status') status?: string) {
    return this.publicService.listEnquiries(status);
  }

  @Patch(':id/status')
  @RequirePermissions('enquiry.manage')
  @Audit({ action: 'ENQUIRY.STATUS_UPDATE', referenceType: 'WebsiteEnquiry' })
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEnquiryStatusDto, @CurrentUser() user: JwtPayloadUser) {
    return this.publicService.updateEnquiryStatus(id, dto.status, user);
  }
}
