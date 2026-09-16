import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ErrorCode } from '../utils/error-codes';

// Single choke point for every unhandled error in the API. Internal details
// (stack traces, SQL errors, etc.) are logged server-side only; clients only
// ever see a stable error code, a friendly message, and a correlation ID they
// can quote to support (spec #73).
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = (request.headers['x-correlation-id'] as string) || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ErrorCode.INTERNAL_ERROR;
    let message: string | string[] = 'Something went wrong. Please try again later.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const anyBody = body as Record<string, unknown>;
        errorCode = (anyBody.errorCode as string) || this.codeFromStatus(status);
        message = (anyBody.message as string | string[]) ?? exception.message;
      } else {
        errorCode = this.codeFromStatus(status);
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`[${correlationId}] ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`[${correlationId}] Unknown exception`, JSON.stringify(exception));
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      correlationId,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHENTICATED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.DUPLICATE_RESOURCE;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
