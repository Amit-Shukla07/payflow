export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access', code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden action', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message: string = 'Insufficient wallet balance', code: string = 'INSUFFICIENT_FUNDS') {
    super(message, 400, code);
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message: string = 'Idempotency key conflict: identical key used with different request parameters', code: string = 'IDEMPOTENCY_CONFLICT') {
    super(message, 409, code);
  }
}

export class ConcurrentTransactionError extends AppError {
  constructor(message: string = 'Transaction is currently being processed. Please wait and retry.', code: string = 'CONCURRENT_TRANSACTION') {
    super(message, 409, code);
  }
}

