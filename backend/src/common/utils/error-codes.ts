// Stable, customer-facing error codes. Never expose stack traces or internal
// messages to clients — map every thrown error to one of these (spec #73).
export enum ErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  BRANCH_ACCESS_DENIED = 'BRANCH_ACCESS_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  SELF_APPROVAL_NOT_ALLOWED = 'SELF_APPROVAL_NOT_ALLOWED',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_FAILED]: 'The request contains invalid data.',
  [ErrorCode.UNAUTHENTICATED]: 'Please sign in to continue.',
  [ErrorCode.UNAUTHORIZED]: 'You do not have permission to perform this action.',
  [ErrorCode.BRANCH_ACCESS_DENIED]: 'This record is outside your assigned branch.',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested item could not be found.',
  [ErrorCode.DUPLICATE_RESOURCE]: 'This record already exists.',
  [ErrorCode.INVALID_STATE_TRANSITION]: 'This action is not allowed in the current status.',
  [ErrorCode.APPROVAL_REQUIRED]: 'This action requires approval from an authorized user.',
  [ErrorCode.SELF_APPROVAL_NOT_ALLOWED]: 'You cannot approve your own request.',
  [ErrorCode.IDEMPOTENCY_CONFLICT]: 'This request was already processed.',
  [ErrorCode.RATE_LIMITED]: 'Too many requests. Please try again shortly.',
  [ErrorCode.ACCOUNT_LOCKED]: 'This account is temporarily locked. Please try again later.',
  [ErrorCode.OTP_INVALID]: 'The verification code is incorrect.',
  [ErrorCode.OTP_EXPIRED]: 'The verification code has expired. Please request a new one.',
  [ErrorCode.PAYMENT_FAILED]: 'Payment could not be completed. Please try again.',
  [ErrorCode.INTERNAL_ERROR]: 'Something went wrong. Please try again later.',
};
