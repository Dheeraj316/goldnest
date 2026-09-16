import { Request } from 'express';

export interface JwtPayloadUser {
  userId: string;
  userType: 'CUSTOMER' | 'EMPLOYEE';
  employeeId?: string;
  customerId?: string;
  branchId?: string;
  roleCode?: string;
  permissions: string[];
  deviceId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayloadUser;
}
