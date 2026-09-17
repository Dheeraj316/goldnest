export interface Branch {
  id: string;
  organizationId: string;
  regionId: string | null;
  code: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pinCode: string;
  phone: string | null;
  email: string | null;
  cashLimit: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions?: { permission: Permission }[];
}

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface Employee {
  id: string;
  employeeCode: string;
  branchId: string;
  roleId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  mobile: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  joinedAt: string | null;
  role: Role;
  branch: Branch;
}

export interface Customer {
  id: string;
  customerCode: string;
  branchId: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  mobile: string;
  kycStatus: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  addresses?: Address[];
  kycRecords?: KycRecord[];
}

export interface Address {
  id: string;
  line1: string;
  line2: string | null;
  pinCode: string;
  city: string;
  state: string;
  type: string;
  isPrimary: boolean;
}

export interface KycRecord {
  id: string;
  customerId: string;
  docType: string;
  maskedNumber: string;
  status: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface Setting {
  id: string;
  key: string;
  scope: string;
  scopeId: string;
  value: unknown;
  dataType: string;
  description: string | null;
  status: string;
  updatedAt: string;
}

export interface ConfigurationVersion {
  id: string;
  settingId: string;
  previousValue: unknown;
  newValue: unknown;
  changeReason: string | null;
  requestedBy: string;
  approvedBy: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  decidedAt: string | null;
  setting?: Setting;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  employeeId: string | null;
  action: string;
  referenceType: string | null;
  referenceId: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  ip: string | null;
  device: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
