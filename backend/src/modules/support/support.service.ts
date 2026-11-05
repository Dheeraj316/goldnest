import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { NumberGeneratorService } from '../number-generator/number-generator.service';
import { AssignTicketDto, CreateTicketDto, QueryTicketsDto, ResolveTicketDto, SLA_HOURS, WaitingForCustomerDto } from './dto/support.dto';

const fullName = (p: { firstName: string; lastName: string | null } | null | undefined) => (p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : null);

const TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  category: true,
  priority: true,
  status: true,
  description: true,
  resolutionNote: true,
  slaDueAt: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: true,
  loanId: true,
  // customerId is required by every path that creates a ticket (see create() below), even though the schema
  // leaves the column nullable, so `customer` is treated as always present from here on.
  customer: { select: { id: true, firstName: true, lastName: true, customerCode: true, mobile: true, branchId: true, branch: { select: { code: true, name: true } } } },
} satisfies Prisma.SupportTicketSelect;
type TicketRow = Prisma.SupportTicketGetPayload<{ select: typeof TICKET_SELECT }>;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly numberGenerator: NumberGeneratorService,
  ) {}

  private conflict(message: string): never {
    throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, message);
  }

  private notFound(): never {
    throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  private invalid(message: string): never {
    throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message);
  }

  private employeeId(actor: JwtPayloadUser): string {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) this.notFound();
    return actor.employeeId;
  }

  private present(t: TicketRow & { assignee?: { firstName: string; lastName: string | null } | null }, loanNumber?: string | null) {
    const customer = t.customer!;
    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      category: t.category,
      priority: t.priority,
      status: t.status,
      description: t.description,
      resolutionNote: t.resolutionNote,
      slaDueAt: t.slaDueAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      assignedTo: t.assignedTo,
      assigneeName: fullName(t.assignee),
      customer: { id: customer.id, name: fullName(customer), customerCode: customer.customerCode, mobile: customer.mobile, branch: customer.branch },
      loan: t.loanId ? { id: t.loanId, loanNumber: loanNumber ?? null } : null,
    };
  }

  /** Bulk-resolves loan numbers for a page of tickets in one query, rather than one lookup per ticket. */
  private async loanNumbersFor(rows: { loanId: string | null }[]): Promise<Map<string, string>> {
    const ids = [...new Set(rows.map((r) => r.loanId).filter((x): x is string => !!x))];
    if (ids.length === 0) return new Map();
    const loans = await this.prisma.loan.findMany({ where: { id: { in: ids } }, select: { id: true, loanNumber: true } });
    return new Map(loans.map((l) => [l.id, l.loanNumber]));
  }

  private async presentOne(t: TicketRow, assignee?: { firstName: string; lastName: string | null } | null) {
    const loanNumber = t.loanId ? (await this.prisma.loan.findUnique({ where: { id: t.loanId }, select: { loanNumber: true } }))?.loanNumber : null;
    return this.present({ ...t, assignee }, loanNumber);
  }

  // =====================================================================
  // CREATE — a customer for themselves, or staff on a customer's behalf
  // =====================================================================

  async create(dto: CreateTicketDto, actor: JwtPayloadUser) {
    const customerId = actor.userType === 'CUSTOMER' ? actor.customerId! : dto.customerId;
    if (!customerId) this.invalid('Which customer is this ticket for?');
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) this.notFound();
    if (actor.userType === 'EMPLOYEE') this.branchScope.assertAccess(actor, customer.branchId);

    if (dto.loanId) {
      const loan = await this.prisma.loan.findUnique({ where: { id: dto.loanId }, select: { customerId: true } });
      if (!loan || loan.customerId !== customerId) this.invalid('That loan does not belong to this customer.');
    }

    const priority = dto.priority ?? 'MEDIUM';
    const ticketNumber = await this.numberGenerator.generateTicketNumber();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId,
        loanId: dto.loanId,
        category: dto.category,
        priority,
        description: dto.description.trim(),
        status: 'OPEN',
        slaDueAt: new Date(Date.now() + SLA_HOURS[priority] * 3_600_000),
      },
      select: TICKET_SELECT,
    });
    return this.presentOne(ticket);
  }

  // =====================================================================
  // STAFF WORKFLOW — assign → in progress ⇄ waiting for customer → resolved → closed
  // =====================================================================

  private async loadForAction(id: string, actor: JwtPayloadUser) {
    const t = await this.prisma.supportTicket.findUnique({ where: { id }, select: TICKET_SELECT });
    if (!t) this.notFound();
    this.branchScope.assertAccess(actor, t.customer!.branchId);
    return t;
  }

  private assertAssignee(t: { assignedTo: string | null }, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    if (t.assignedTo !== employeeId) this.conflict('Only the employee this ticket is assigned to can do that.');
    return employeeId;
  }

  async assign(id: string, dto: AssignTicketDto, actor: JwtPayloadUser) {
    const t = await this.loadForAction(id, actor);
    if (['RESOLVED', 'CLOSED'].includes(t.status)) this.conflict(`Ticket is ${t.status}; it can no longer be assigned.`);
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId }, select: { id: true, branchId: true } });
    if (!employee) this.invalid('That employee does not exist.');
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { assignedTo: dto.employeeId, status: t.status === 'OPEN' ? 'ASSIGNED' : t.status },
      select: TICKET_SELECT,
    });
    return this.presentOne(updated);
  }

  async startProgress(id: string, actor: JwtPayloadUser) {
    const t = await this.loadForAction(id, actor);
    if (t.status !== 'ASSIGNED') this.conflict(`Ticket is ${t.status}; only an assigned ticket can be started.`);
    this.assertAssignee(t, actor);
    const updated = await this.prisma.supportTicket.update({ where: { id }, data: { status: 'IN_PROGRESS' }, select: TICKET_SELECT });
    return this.presentOne(updated);
  }

  async markWaitingForCustomer(id: string, dto: WaitingForCustomerDto, actor: JwtPayloadUser) {
    const t = await this.loadForAction(id, actor);
    if (t.status !== 'IN_PROGRESS') this.conflict(`Ticket is ${t.status}; only a ticket being worked on can wait on the customer.`);
    this.assertAssignee(t, actor);
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'WAITING_FOR_CUSTOMER', resolutionNote: dto.note?.trim() || t.resolutionNote },
      select: TICKET_SELECT,
    });
    return this.presentOne(updated);
  }

  async resume(id: string, actor: JwtPayloadUser) {
    const t = await this.loadForAction(id, actor);
    if (t.status !== 'WAITING_FOR_CUSTOMER') this.conflict(`Ticket is ${t.status}; nothing to resume.`);
    this.assertAssignee(t, actor);
    const updated = await this.prisma.supportTicket.update({ where: { id }, data: { status: 'IN_PROGRESS' }, select: TICKET_SELECT });
    return this.presentOne(updated);
  }

  async resolve(id: string, dto: ResolveTicketDto, actor: JwtPayloadUser) {
    const t = await this.loadForAction(id, actor);
    if (!['IN_PROGRESS', 'WAITING_FOR_CUSTOMER'].includes(t.status)) this.conflict(`Ticket is ${t.status}; it isn't being worked on.`);
    this.assertAssignee(t, actor);
    const updated = await this.prisma.supportTicket.update({ where: { id }, data: { status: 'RESOLVED', resolutionNote: dto.resolutionNote.trim() }, select: TICKET_SELECT });
    return this.presentOne(updated);
  }

  async reopen(id: string, actor: JwtPayloadUser) {
    const t = await this.loadForAction(id, actor);
    if (t.status !== 'RESOLVED') this.conflict(`Ticket is ${t.status}; only a resolved ticket can be reopened.`);
    const updated = await this.prisma.supportTicket.update({ where: { id }, data: { status: 'IN_PROGRESS' }, select: TICKET_SELECT });
    return this.presentOne(updated);
  }

  async close(id: string, actor: JwtPayloadUser) {
    const t = await this.loadForAction(id, actor);
    if (t.status !== 'RESOLVED') this.conflict(`Ticket is ${t.status}; only a resolved ticket can be closed.`);
    const updated = await this.prisma.supportTicket.update({ where: { id }, data: { status: 'CLOSED' }, select: TICKET_SELECT });
    return this.presentOne(updated);
  }

  // =====================================================================
  // READS
  // =====================================================================

  async list(query: QueryTicketsDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const branchFilter = this.branchScope.isCrossBranch(actor)
      ? query.branchId
        ? { customer: { branchId: query.branchId } }
        : {}
      : { customer: { branchId: actor.branchId } };
    const where: Prisma.SupportTicketWhereInput = {
      ...branchFilter,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.assignedToMe === 'true' ? { assignedTo: employeeId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        select: TICKET_SELECT,
        orderBy: [{ status: 'asc' }, { slaDueAt: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    const employeeIds = [...new Set(rows.map((r) => r.assignedTo).filter((x): x is string => !!x))];
    const [employees, loanNumbers] = await Promise.all([
      employeeIds.length ? this.prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, firstName: true, lastName: true } }) : Promise.resolve([]),
      this.loanNumbersFor(rows),
    ]);
    const nameOf = new Map(employees.map((e) => [e.id, fullName(e)]));
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: rows.map((t) => ({ ...this.present(t, t.loanId ? loanNumbers.get(t.loanId) : null), assigneeName: t.assignedTo ? nameOf.get(t.assignedTo) : null })),
    };
  }

  async getOne(id: string, actor: JwtPayloadUser) {
    const t = await this.prisma.supportTicket.findUnique({ where: { id }, select: TICKET_SELECT });
    if (!t) this.notFound();
    if (actor.userType === 'CUSTOMER') {
      if (t.customer!.id !== actor.customerId) throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    } else {
      this.branchScope.assertAccess(actor, t.customer!.branchId);
    }
    const assignee = t.assignedTo ? await this.prisma.employee.findUnique({ where: { id: t.assignedTo }, select: { firstName: true, lastName: true } }) : null;
    return this.presentOne(t, assignee);
  }

  async listMine(actor: JwtPayloadUser) {
    if (actor.userType !== 'CUSTOMER' || !actor.customerId) this.notFound();
    const rows = await this.prisma.supportTicket.findMany({ where: { customerId: actor.customerId }, select: TICKET_SELECT, orderBy: { createdAt: 'desc' } });
    const loanNumbers = await this.loanNumbersFor(rows);
    return rows.map((t) => this.present(t, t.loanId ? loanNumbers.get(t.loanId) : null));
  }

  async assignableEmployees(actor: JwtPayloadUser) {
    const branchFilter = this.branchScope.isCrossBranch(actor) ? {} : { branchId: actor.branchId };
    const rows = await this.prisma.employee.findMany({
      where: { ...branchFilter, status: 'ACTIVE', role: { permissions: { some: { permission: { code: 'ticket.manage' } } } } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    });
    return rows.map((e) => ({ id: e.id, name: fullName(e) }));
  }
}
