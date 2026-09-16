import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, JwtPayloadUser } from '../interfaces/authenticated-request.interface';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayloadUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});
