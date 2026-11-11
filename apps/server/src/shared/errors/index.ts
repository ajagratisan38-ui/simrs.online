export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(statusCode: number, message: string, code: string, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    Object.setPrototypeOf(this, new.target.prototype)
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} tidak ditemukan`, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown

  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR')
    this.details = details
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Autentikasi diperlukan') {
    super(401, message, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Akses ditolak') {
    super(403, message, 'FORBIDDEN')
  }
}

export class InternalError extends AppError {
  constructor(message = 'Terjadi kesalahan internal') {
    super(500, message, 'INTERNAL_ERROR', false)
  }
}
