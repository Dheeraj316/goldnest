import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PublicService } from './public.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';

// Unauthenticated surface for the marketing site (public-website). Every
// route here is reachable from the open internet with no login, so it must
// stay read-only-or-narrowly-write, rate-limited, and never expose anything
// beyond what a website visitor should already see.
@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('branches')
  @Public()
  @ApiOperation({ summary: 'List active branches for the public branch locator' })
  listBranches() {
    return this.publicService.listActiveBranches();
  }

  @Post('enquiries')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Submit a contact/enquiry form from the public website' })
  createEnquiry(@Body() dto: CreateEnquiryDto) {
    return this.publicService.createEnquiry(dto);
  }
}
