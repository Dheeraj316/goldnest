import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ERROR_MESSAGES } from '../utils/error-codes';

// Throw this instead of a bare HttpException so every error carries a stable
// machine-readable code the mobile/web clients can branch on, never a raw message.
export class AppException extends HttpException {
  constructor(code: ErrorCode, status: HttpStatus = HttpStatus.BAD_REQUEST, overrideMessage?: string) {
    super(
      {
        errorCode: code,
        message: overrideMessage || ERROR_MESSAGES[code],
      },
      status,
    );
  }
}
