import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadUser } from '../../../common/interfaces/authenticated-request.interface';
import { RbacService } from '../../rbac/rbac.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly rbacService: RbacService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  // Whatever this returns becomes `request.user`. Only short-lived, signed
  // claims live here — never trust anything beyond this payload as identity.
  //
  // Identity comes from the signed token, but an employee's role and permissions are read live: the token's
  // own copy is only a sign-in snapshot, and honouring it would mean access an admin has just switched off (or
  // an employee who has just been deactivated or moved to another role) keeps working until the token expires.
  async validate(payload: JwtPayloadUser): Promise<JwtPayloadUser> {
    if (payload.userType !== 'EMPLOYEE') return payload;
    const live = payload.employeeId ? await this.rbacService.getLiveAccess(payload.employeeId) : null;
    if (!live) throw new UnauthorizedException();
    return { ...payload, roleCode: live.roleCode, permissions: live.permissions };
  }
}
