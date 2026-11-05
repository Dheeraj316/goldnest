import { Body, Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { AssignTicketDto, CreateTicketDto, QueryTicketsDto, ResolveTicketDto, WaitingForCustomerDto } from './dto/support.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';

@ApiTags('support')
@ApiBearerAuth()
@Controller('support-tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ---- Customer self-service ---- (literal paths must be declared before the ':id' route below)

  @Get('me')
  listOwn(@CurrentUser() user: JwtPayloadUser) {
    this.assertCustomer(user);
    return this.supportService.listMine(user);
  }

  // ---- Staff-facing ----

  @Get()
  @RequirePermissions('ticket.view')
  list(@Query() query: QueryTicketsDto, @CurrentUser() user: JwtPayloadUser) {
    return this.supportService.list(query, user);
  }

  @Get('assignable-employees')
  @RequirePermissions('ticket.manage')
  assignable(@CurrentUser() user: JwtPayloadUser) {
    return this.supportService.assignableEmployees(user);
  }

  // ---- Shared: raise a ticket (customer for themselves, or staff with ticket.manage on someone's behalf) ----

  @Post()
  @Audit({ action: 'SUPPORT_TICKET.CREATE', referenceType: 'SupportTicket' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: JwtPayloadUser) {
    if (user.userType === 'EMPLOYEE' && !user.permissions.includes('ticket.manage')) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    return this.supportService.create(dto, user);
  }

  // ---- Shared read: a customer viewing their own ticket, or staff with ticket.view — LAST: ':id' would
  // otherwise swallow the literal routes above.

  @Get(':id')
  @Audit({ action: 'SUPPORT_TICKET.VIEW', referenceType: 'SupportTicket' })
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    if (user.userType === 'EMPLOYEE' && !user.permissions.includes('ticket.view')) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    return this.supportService.getOne(id, user);
  }

  @Post(':id/assign')
  @RequirePermissions('ticket.manage')
  @Audit({ action: 'SUPPORT_TICKET.ASSIGN', referenceType: 'SupportTicket' })
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignTicketDto, @CurrentUser() user: JwtPayloadUser) {
    return this.supportService.assign(id, dto, user);
  }

  @Post(':id/start')
  @RequirePermissions('ticket.manage')
  @Audit({ action: 'SUPPORT_TICKET.START', referenceType: 'SupportTicket' })
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.supportService.startProgress(id, user);
  }

  @Post(':id/waiting-for-customer')
  @RequirePermissions('ticket.manage')
  @Audit({ action: 'SUPPORT_TICKET.WAIT', referenceType: 'SupportTicket' })
  wait(@Param('id', ParseUUIDPipe) id: string, @Body() dto: WaitingForCustomerDto, @CurrentUser() user: JwtPayloadUser) {
    return this.supportService.markWaitingForCustomer(id, dto, user);
  }

  @Post(':id/resume')
  @RequirePermissions('ticket.manage')
  @Audit({ action: 'SUPPORT_TICKET.RESUME', referenceType: 'SupportTicket' })
  resume(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.supportService.resume(id, user);
  }

  @Post(':id/resolve')
  @RequirePermissions('ticket.manage')
  @Audit({ action: 'SUPPORT_TICKET.RESOLVE', referenceType: 'SupportTicket' })
  resolve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveTicketDto, @CurrentUser() user: JwtPayloadUser) {
    return this.supportService.resolve(id, dto, user);
  }

  @Post(':id/reopen')
  @RequirePermissions('ticket.manage')
  @Audit({ action: 'SUPPORT_TICKET.REOPEN', referenceType: 'SupportTicket' })
  reopen(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.supportService.reopen(id, user);
  }

  @Post(':id/close')
  @RequirePermissions('ticket.manage')
  @Audit({ action: 'SUPPORT_TICKET.CLOSE', referenceType: 'SupportTicket' })
  close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.supportService.close(id, user);
  }

  private assertCustomer(user: JwtPayloadUser) {
    if (user.userType !== 'CUSTOMER' || !user.customerId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN, 'This endpoint is only available to customer accounts.');
    }
  }
}
