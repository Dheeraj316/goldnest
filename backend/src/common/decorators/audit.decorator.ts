import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

export interface AuditMeta {
  action: string; // e.g. "LOAN.APPROVE", "CUSTOMER.KYC.VIEW"
  referenceType?: string; // e.g. "Loan" — resolved from route param `:id` by default
}

// Marks a controller method for automatic audit-log capture (spec #44).
// Handlers that need before/after value diffs should still write an explicit
// AuditLog entry via AuditLogService — this decorator guarantees at minimum
// WHO/WHAT/WHEN/WHERE is recorded even if the handler doesn't.
export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_ACTION_KEY, meta);
