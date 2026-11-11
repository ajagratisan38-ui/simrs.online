import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../shared/errors'
import { logger } from '../shared/logger'
import { env } from '../config/env'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data tidak valid',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    })
    return
  }

  // Custom application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    })
    return
  }

  // Unexpected errors
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
  })

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isDev ? err.message : 'Terjadi kesalahan internal',
    },
  })
}
