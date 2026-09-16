import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtPayloadUser } from '../interfaces/authenticated-request.interface';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../utils/error-codes';

// Roles that see across branches (regional/admin tiers). Everyone else is
// confined to their own assigned branch. This mirrors the org hierarchy in
// spec #65 and enforces spec #48's "branch-level data isolation must be
// enforced" — deliberately a plain injectable, not a guard, because the
// target branch is usually only known after loading the entity (a loan,
// a customer, a collateral record), not from the route params alone.
const CROSS_BRANCH_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'AUDITOR', 'REPORTING_USER']);

@Injectable()
export class BranchScopeService {
  assertAccess(user: JwtPayloadUser, targetBranchId: string | null | undefined): void {
    if (user.userType !== 'EMPLOYEE') {
      return; // customer-facing endpoints scope by customerId, not branch
    }
    if (user.roleCode && CROSS_BRANCH_ROLES.has(user.roleCode)) {
      return;
    }
    if (!targetBranchId || targetBranchId !== user.branchId) {
      throw new AppException(ErrorCode.BRANCH_ACCESS_DENIED, HttpStatus.FORBIDDEN);
    }
  }

  isCrossBranch(user: JwtPayloadUser): boolean {
    return !!user.roleCode && CROSS_BRANCH_ROLES.has(user.roleCode);
  }
}
