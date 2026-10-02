import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: issues[0]?.message || 'Validation error',
        details: issues,
      },
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: field === 'sku' ? 'DUPLICATE_SKU' : 'CONFLICT',
        message: `A record with this ${field} already exists.`,
      },
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid ID format for ${err.path}`,
      },
    });
  }

  const statusCode =
    err.code === 'PRODUCT_NOT_FOUND' || err.code === 'CATEGORY_NOT_FOUND'
      ? 404
      : err.code === 'INSUFFICIENT_STOCK' || err.code === 'INVALID_QUANTITY'
      ? 400
      : err.code === 'DUPLICATE_SKU' || err.code === 'CONFLICT'
      ? 409
      : err.code === 'UNAUTHORIZED'
      ? 401
      : err.code === 'FORBIDDEN'
      ? 403
      : 500;

  // Never expose raw stack trace to client
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected error occurred. Please try again.',
    },
  });
}
