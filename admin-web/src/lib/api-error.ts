// Plain data class, no server-only imports — safe for Client Components
// (e.g. error.tsx) to import, unlike api-server.ts which pulls in next/headers.
export class ApiError extends Error {
  status: number;
  errorCode: string;
  correlationId?: string;

  constructor(status: number, errorCode: string, message: string, correlationId?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.correlationId = correlationId;
  }
}
