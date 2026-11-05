import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type SequenceEntityType =
  'CUSTOMER' | 'LOAN' | 'PAYMENT' | 'COLLATERAL' | 'PACKET' | 'AUCTION' | 'APPLICATION' | 'APPOINTMENT' | 'RECEIPT' | 'TICKET' | 'EMPLOYEE' | 'COLLECTION_CASE';

// Server-side controlled, gap-tolerant sequence numbers (spec #63). Numbers
// are NEVER generated client-side and never derived from a row's own primary
// key, so they stay stable even if records are reordered, batched, or
// generated across concurrent requests.
//
// Atomicity: the increment is a single `INSERT ... ON CONFLICT DO UPDATE
// ... RETURNING` statement, so concurrent callers never observe or hand out
// the same value — no read-modify-write race, no application-level locking.
@Injectable()
export class NumberGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextSequenceValue(entityType: SequenceEntityType, scopeKey: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ last_value: number }[]>`
      INSERT INTO number_sequences (id, entity_type, scope_key, last_value, updated_at)
      VALUES (gen_random_uuid(), ${entityType}, ${scopeKey}, 1, now())
      ON CONFLICT (entity_type, scope_key)
      DO UPDATE SET last_value = number_sequences.last_value + 1, updated_at = now()
      RETURNING last_value;
    `;
    return rows[0].last_value;
  }

  private pad(value: number, width = 6): string {
    return value.toString().padStart(width, '0');
  }

  private currentYear(): number {
    return new Date().getFullYear();
  }

  /** CUS-2026-000001 */
  async generateCustomerCode(): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('CUSTOMER', `${year}`);
    return `CUS-${year}-${this.pad(seq)}`;
  }

  /** GL-BLR-2026-000001 (productPrefix e.g. "GL" for gold loan) */
  async generateLoanNumber(branchCode: string, productPrefix: string): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('LOAN', `${branchCode}-${productPrefix}-${year}`);
    return `${productPrefix}-${branchCode}-${year}-${this.pad(seq)}`;
  }

  /** APP-2026-000001 */
  async generateApplicationNumber(): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('APPLICATION', `${year}`);
    return `APP-${year}-${this.pad(seq)}`;
  }

  /** PAY-2026-000001 */
  async generatePaymentNumber(): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('PAYMENT', `${year}`);
    return `PAY-${year}-${this.pad(seq)}`;
  }

  /** COL-2026-000001 */
  async generateCollateralCode(): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('COLLATERAL', `${year}`);
    return `COL-${year}-${this.pad(seq)}`;
  }

  /** PKT-BLR-2026-000001 */
  async generatePacketNumber(branchCode: string): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('PACKET', `${branchCode}-${year}`);
    return `PKT-${branchCode}-${year}-${this.pad(seq)}`;
  }

  /** AUC-2026-000001 */
  async generateAuctionNumber(): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('AUCTION', `${year}`);
    return `AUC-${year}-${this.pad(seq)}`;
  }

  /** RCT-2026-000001 */
  async generateReceiptNumber(): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('RECEIPT', `${year}`);
    return `RCT-${year}-${this.pad(seq)}`;
  }

  /** TCK-2026-000001 */
  async generateTicketNumber(): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('TICKET', `${year}`);
    return `TCK-${year}-${this.pad(seq)}`;
  }

  /** CC-2026-000001 (not "COL-", which collateral already uses) */
  async generateCollectionCaseNumber(): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('COLLECTION_CASE', `${year}`);
    return `CC-${year}-${this.pad(seq)}`;
  }

  /** EMP-BLR-000001 */
  async generateEmployeeCode(branchCode: string): Promise<string> {
    const seq = await this.nextSequenceValue('EMPLOYEE', branchCode);
    return `EMP-${branchCode}-${this.pad(seq)}`;
  }

  /** APT-2026-000001 */
  async generateAppointmentRef(): Promise<string> {
    const year = this.currentYear();
    const seq = await this.nextSequenceValue('APPOINTMENT', `${year}`);
    return `APT-${year}-${this.pad(seq)}`;
  }
}
