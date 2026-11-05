import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, PacketStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { NumberGeneratorService } from '../number-generator/number-generator.service';
import {
  AuditPacketDto,
  CloseOutPacketDto,
  CreateVaultDto,
  CreateVaultLocationDto,
  MovePacketDto,
  QueryPacketsDto,
  SealPacketDto,
  StorePacketDto,
} from './dto/vault.dto';

type Tx = Prisma.TransactionClient;

// Collateral still actively pledged (not yet released, sold or otherwise disposed of) — the states a packet
// may legitimately be sealed, stored or moved for. Kept identical to the set the loans/auctions modules
// already treat as "still active" (see e.g. loans.service.ts's part-release/renewal guards).
const ACTIVE_COLLATERAL_STATUSES = ['PENDING_APPRAISAL', 'APPRAISED', 'STORED'] as const;

const fullName = (p: { firstName: string; lastName: string | null } | null | undefined) => (p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : null);

const locationPath = (loc: { type: string; code: string; parent?: { type: string; code: string; parent?: { type: string; code: string } | null } | null } | null | undefined): string | null => {
  if (!loc) return null;
  const parts: string[] = [];
  let cur: typeof loc | null | undefined = loc;
  let guard = 0;
  while (cur && guard++ < 5) {
    parts.unshift(`${cur.type} ${cur.code}`);
    cur = cur.parent;
  }
  return parts.join(' › ');
};

@Injectable()
export class VaultService {
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

  private employeeId(actor: JwtPayloadUser): string {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) this.notFound();
    return actor.employeeId;
  }

  // =====================================================================
  // VAULTS & LOCATIONS
  // =====================================================================

  async listVaults(actor: JwtPayloadUser, branchId?: string) {
    const targetBranch = branchId || actor.branchId;
    this.branchScope.assertAccess(actor, targetBranch);
    const vaults = await this.prisma.vault.findMany({
      where: targetBranch ? { branchId: targetBranch } : undefined,
      include: { locations: { orderBy: [{ type: 'asc' }, { code: 'asc' }] } },
      orderBy: { name: 'asc' },
    });
    return vaults.map((v) => ({
      id: v.id,
      name: v.name,
      branchId: v.branchId,
      locations: this.buildLocationTree(v.locations),
    }));
  }

  private buildLocationTree(flat: { id: string; type: string; code: string; parentId: string | null }[]) {
    const byParent = new Map<string | null, typeof flat>();
    for (const l of flat) {
      const key = l.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(l);
    }
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? []).map((l) => ({ id: l.id, type: l.type, code: l.code, children: build(l.id) }));
    return build(null);
  }

  async createVault(dto: CreateVaultDto, actor: JwtPayloadUser) {
    const branchId = dto.branchId || actor.branchId;
    if (!branchId) this.notFound();
    this.branchScope.assertAccess(actor, branchId);
    return this.prisma.vault.create({ data: { branchId, name: dto.name } });
  }

  async addLocation(vaultId: string, dto: CreateVaultLocationDto, actor: JwtPayloadUser) {
    const vault = await this.prisma.vault.findUnique({ where: { id: vaultId } });
    if (!vault) this.notFound();
    this.branchScope.assertAccess(actor, vault.branchId);
    if (dto.parentId) {
      const parent = await this.prisma.vaultLocation.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.vaultId !== vaultId) this.invalid('The parent location must be in the same vault.');
    }
    try {
      return await this.prisma.vaultLocation.create({ data: { vaultId, type: dto.type, code: dto.code, parentId: dto.parentId ?? null } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') this.conflict(`${dto.type} ${dto.code} already exists in this vault.`);
      throw e;
    }
  }

  private invalid(message: string): never {
    throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message);
  }

  // =====================================================================
  // COLLATERAL AWAITING A PACKET
  // =====================================================================

  async collateralAwaitingPacket(actor: JwtPayloadUser, branchId?: string) {
    const targetBranch = branchId || (this.branchScope.isCrossBranch(actor) ? undefined : actor.branchId);
    if (targetBranch) this.branchScope.assertAccess(actor, targetBranch);
    const rows = await this.prisma.collateral.findMany({
      where: {
        status: { in: [...ACTIVE_COLLATERAL_STATUSES] },
        ...(targetBranch ? { branchId: targetBranch } : {}),
        packets: { none: { status: { notIn: ['RELEASED', 'AUCTIONED', 'DESTROYED'] } } },
      },
      select: {
        id: true,
        collateralCode: true,
        status: true,
        totalNetWeight: true,
        loan: {
          select: {
            loanNumber: true,
            branch: { select: { code: true, name: true } },
            customer: { select: { firstName: true, lastName: true, customerCode: true } },
          },
        },
        items: { select: { id: true, itemType: true, netWeight: true, purityKarat: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return rows.map((c) => ({
      collateralId: c.id,
      collateralCode: c.collateralCode,
      status: c.status,
      loanNumber: c.loan.loanNumber,
      branch: c.loan.branch,
      customerName: fullName(c.loan.customer),
      customerCode: c.loan.customer.customerCode,
      netWeight: c.totalNetWeight ? c.totalNetWeight.toString() : null,
      items: c.items.map((i) => ({ id: i.id, itemType: i.itemType, netWeight: i.netWeight.toString(), purityKarat: i.purityKarat.toString() })),
    }));
  }

  // =====================================================================
  // PACKET LIFECYCLE — seal → store → (move)* → audit* → close out
  // =====================================================================

  /** 1. Seals the collateral's gold into one tamper-evident packet. One active packet per collateral. */
  async sealPacket(dto: SealPacketDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const collateral = await this.prisma.collateral.findUnique({
      where: { id: dto.collateralId },
      include: { packets: { where: { status: { notIn: ['RELEASED', 'AUCTIONED', 'DESTROYED'] } } }, loan: { select: { branchId: true } } },
    });
    if (!collateral) this.notFound();
    this.branchScope.assertAccess(actor, collateral.branchId);
    if (!ACTIVE_COLLATERAL_STATUSES.includes(collateral.status as (typeof ACTIVE_COLLATERAL_STATUSES)[number])) {
      this.conflict(`This collateral is ${collateral.status}; it can no longer be sealed into a packet.`);
    }
    if (collateral.packets.length > 0) this.conflict('This collateral already has an active packet.');

    const branch = await this.prisma.branch.findUnique({ where: { id: collateral.branchId }, select: { code: true } });
    const [packetNumber, sealNumber] = [await this.numberGenerator.generatePacketNumber(branch!.code), randomBytes(5).toString('hex').toUpperCase()];

    return this.prisma.$transaction(async (tx) => {
      const packet = await tx.packet.create({
        data: { packetNumber, collateralId: collateral.id, sealNumber, qrCode: packetNumber, status: 'RECEIVED' },
      });
      await tx.collateralMovement.create({
        data: { collateralId: collateral.id, packetId: packet.id, employeeId, fromLocation: null, toLocation: null, reason: 'Packet sealed' },
      });
      return packet;
    });
  }

  private async loadPacketForAction(id: string, actor: JwtPayloadUser, tx: Tx | PrismaService = this.prisma) {
    const packet = await tx.packet.findUnique({
      where: { id },
      include: { collateral: { select: { id: true, status: true, branchId: true } } },
    });
    if (!packet) this.notFound();
    this.branchScope.assertAccess(actor, packet.collateral.branchId);
    return packet;
  }

  private async loadLocation(vaultLocationId: string, actor: JwtPayloadUser, tx: Tx | PrismaService = this.prisma) {
    const loc = await tx.vaultLocation.findUnique({ where: { id: vaultLocationId }, include: { vault: true, parent: { include: { parent: true } } } });
    if (!loc) this.notFound();
    this.branchScope.assertAccess(actor, loc.vault.branchId);
    return loc;
  }

  /** 2. First placement in the vault. Also carries the collateral into STORED (identical to APPRAISED everywhere it is checked). */
  async storePacket(id: string, dto: StorePacketDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const packet = await this.loadPacketForAction(id, actor);
    if (packet.status !== 'RECEIVED') this.conflict(`Packet is ${packet.status}; only a freshly sealed packet can be placed for the first time — use move instead.`);
    const loc = await this.loadLocation(dto.vaultLocationId, actor);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packet.update({ where: { id }, data: { status: 'STORED', vaultLocationId: loc.id } });
      if (packet.collateral.status === 'APPRAISED') {
        await tx.collateral.update({ where: { id: packet.collateral.id }, data: { status: 'STORED' } });
      }
      await tx.collateralMovement.create({
        data: { collateralId: packet.collateral.id, packetId: id, employeeId, fromLocation: null, toLocation: locationPath(loc), reason: dto.reason?.trim() || 'Initial storage' },
      });
      return updated;
    });
  }

  /** 3. Moves an already-stored packet to a different location. */
  async movePacket(id: string, dto: MovePacketDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const packet = await this.loadPacketForAction(id, actor);
    if (packet.status !== 'STORED') this.conflict(`Packet is ${packet.status}; only a stored packet can be moved.`);
    const from = packet.vaultLocationId ? await this.loadLocation(packet.vaultLocationId, actor) : null;
    const to = await this.loadLocation(dto.vaultLocationId, actor);
    if (to.id === packet.vaultLocationId) this.invalid('The packet is already at that location.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packet.update({ where: { id }, data: { vaultLocationId: to.id } });
      await tx.collateralMovement.create({
        data: { collateralId: packet.collateral.id, packetId: id, employeeId, fromLocation: locationPath(from), toLocation: locationPath(to), reason: dto.reason.trim(), authorizedBy: employeeId },
      });
      return updated;
    });
  }

  /** A physical stock check: logged on the movement trail, never changes where the packet is recorded as being. */
  async auditPacket(id: string, dto: AuditPacketDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const packet = await this.loadPacketForAction(id, actor);
    if (!['STORED', 'AUDITED'].includes(packet.status)) this.conflict(`Packet is ${packet.status}; nothing to physically audit.`);
    const loc = packet.vaultLocationId ? await this.loadLocation(packet.vaultLocationId, actor) : null;
    const reason = dto.present ? `Physical audit: confirmed present at ${locationPath(loc) ?? 'its recorded location'}` : `Physical audit: NOT FOUND at ${locationPath(loc) ?? 'its recorded location'}${dto.notes ? ` — ${dto.notes.trim()}` : ''}`;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packet.update({ where: { id }, data: { status: dto.present ? 'AUDITED' : packet.status } });
      await tx.collateralMovement.create({ data: { collateralId: packet.collateral.id, packetId: id, employeeId, fromLocation: locationPath(loc), toLocation: locationPath(loc), reason } });
      return updated;
    });
  }

  /** Confirms the physical handover once the loan side has already authorised it (release on closure/part-release, or a completed auction sale). */
  async closeOutPacket(id: string, dto: CloseOutPacketDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const packet = await this.loadPacketForAction(id, actor);
    if (!['STORED', 'AUDITED'].includes(packet.status)) this.conflict(`Packet is ${packet.status}; nothing to close out.`);
    const target = packet.collateral.status === 'RELEASED' ? 'RELEASED' : packet.collateral.status === 'AUCTIONED' ? 'AUCTIONED' : null;
    if (!target) this.conflict('This collateral has not been released or sold at auction yet — the branch has to authorise that first.');
    const loc = packet.vaultLocationId ? await this.loadLocation(packet.vaultLocationId, actor) : null;
    const reason = dto.reason?.trim() || (target === 'RELEASED' ? 'Handed back to the borrower' : 'Handed to the winning bidder');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packet.update({ where: { id }, data: { status: target, vaultLocationId: null } });
      await tx.collateralMovement.create({ data: { collateralId: packet.collateral.id, packetId: id, employeeId, fromLocation: locationPath(loc), toLocation: target === 'RELEASED' ? 'Returned to borrower' : 'Auction buyer', reason } });
      return updated;
    });
  }

  // =====================================================================
  // READS
  // =====================================================================

  async listPackets(query: QueryPacketsDto, actor: JwtPayloadUser) {
    const targetBranch = query.branchId || (this.branchScope.isCrossBranch(actor) ? undefined : actor.branchId);
    if (targetBranch) this.branchScope.assertAccess(actor, targetBranch);
    const where: Prisma.PacketWhereInput = {
      ...(query.status ? { status: query.status as PacketStatus } : {}),
      ...(query.vaultLocationId ? { vaultLocationId: query.vaultLocationId } : {}),
      collateral: {
        ...(targetBranch ? { branchId: targetBranch } : {}),
      },
      ...(query.search
        ? {
            OR: [
              { packetNumber: { contains: query.search, mode: 'insensitive' } },
              { sealNumber: { contains: query.search, mode: 'insensitive' } },
              { collateral: { collateralCode: { contains: query.search, mode: 'insensitive' } } },
              { collateral: { loan: { loanNumber: { contains: query.search, mode: 'insensitive' } } } },
              { collateral: { loan: { customer: { firstName: { contains: query.search, mode: 'insensitive' } } } } },
              { collateral: { loan: { customer: { lastName: { contains: query.search, mode: 'insensitive' } } } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.packet.findMany({
        where,
        include: {
          collateral: {
            select: { collateralCode: true, status: true, loan: { select: { loanNumber: true, customer: { select: { firstName: true, lastName: true } } } } },
          },
          vaultLocation: { include: { parent: { include: { parent: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.packet.count({ where }),
    ]);
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: rows.map((p) => ({
        id: p.id,
        packetNumber: p.packetNumber,
        sealNumber: p.sealNumber,
        status: p.status,
        collateralCode: p.collateral.collateralCode,
        collateralStatus: p.collateral.status,
        loanNumber: p.collateral.loan.loanNumber,
        customerName: fullName(p.collateral.loan.customer),
        location: locationPath(p.vaultLocation),
      })),
    };
  }

  async getPacket(id: string, actor: JwtPayloadUser) {
    const packet = await this.prisma.packet.findUnique({
      where: { id },
      include: {
        collateral: {
          select: {
            id: true,
            collateralCode: true,
            status: true,
            branchId: true,
            loan: { select: { loanNumber: true, id: true, customer: { select: { firstName: true, lastName: true, customerCode: true } } } },
            items: { select: { id: true, itemType: true, netWeight: true, purityKarat: true } },
          },
        },
        vaultLocation: { include: { vault: true, parent: { include: { parent: true } } } },
        movements: { orderBy: { occurredAt: 'desc' }, include: { employee: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!packet) this.notFound();
    this.branchScope.assertAccess(actor, packet.collateral.branchId);
    return {
      id: packet.id,
      packetNumber: packet.packetNumber,
      sealNumber: packet.sealNumber,
      qrCode: packet.qrCode,
      status: packet.status,
      createdAt: packet.createdAt,
      location: packet.vaultLocation ? { id: packet.vaultLocation.id, path: locationPath(packet.vaultLocation), vaultName: packet.vaultLocation.vault.name } : null,
      collateral: {
        id: packet.collateral.id,
        collateralCode: packet.collateral.collateralCode,
        status: packet.collateral.status,
        loanId: packet.collateral.loan.id,
        loanNumber: packet.collateral.loan.loanNumber,
        customerName: fullName(packet.collateral.loan.customer),
        customerCode: packet.collateral.loan.customer.customerCode,
        items: packet.collateral.items.map((i) => ({ id: i.id, itemType: i.itemType, netWeight: i.netWeight.toString(), purityKarat: i.purityKarat.toString() })),
      },
      movements: packet.movements.map((m) => ({
        id: m.id,
        fromLocation: m.fromLocation,
        toLocation: m.toLocation,
        reason: m.reason,
        occurredAt: m.occurredAt,
        by: fullName(m.employee),
      })),
    };
  }
}
