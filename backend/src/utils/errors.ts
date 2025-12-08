export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication Errors
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'AUTH_001') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'AUTH_003') {
    super(message, 403, code);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token expired') {
    super(message, 401, 'AUTH_004');
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token') {
    super(message, 401, 'AUTH_005');
  }
}

export class TwoFactorRequiredError extends AppError {
  constructor() {
    super('Two-factor authentication required', 403, 'AUTH_006');
  }
}

// User Errors
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'USER_001');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'USER_002') {
    super(message, 409, code);
  }
}

// Validation Errors
export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>) {
    super('Validation failed', 400, 'VAL_001', details);
  }
}

// Rate Limit Error
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'AUTH_008');
  }
}

// Internal Server Error
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'SRV_001');
  }
}

// Error Codes Reference
export const ERROR_CODES = {
  // Auth
  AUTH_001: 'Invalid credentials',
  AUTH_002: 'Account not verified',
  AUTH_003: 'Account disabled',
  AUTH_004: 'Token expired',
  AUTH_005: 'Token invalid',
  AUTH_006: '2FA required',
  AUTH_007: 'Invalid 2FA code',
  AUTH_008: 'Too many attempts',

  // User
  USER_001: 'User not found',
  USER_002: 'Email already exists',
  USER_003: 'Invalid password',

  // OAuth
  OAUTH_001: 'OAuth provider error',
  OAUTH_002: 'Account already linked',

  // Validation
  VAL_001: 'Validation error',

  // Server
  SRV_001: 'Internal server error',
} as const;
