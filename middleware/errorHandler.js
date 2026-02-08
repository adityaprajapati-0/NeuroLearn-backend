/**
 * Centralized Error Handler Middleware for NeuroLearn API
 * Provides structured JSON error responses with error codes
 */

// Error codes
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(code, message, statusCode = 500, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Create validation error
 */
export function validationError(message, details = null) {
  return new ApiError(ErrorCodes.VALIDATION_ERROR, message, 400, details);
}

/**
 * Create not found error
 */
export function notFoundError(message = "Resource not found") {
  return new ApiError(ErrorCodes.NOT_FOUND, message, 404);
}

/**
 * Create database error
 */
export function databaseError(message = "Database operation failed") {
  return new ApiError(ErrorCodes.DATABASE_ERROR, message, 500);
}

/**
 * Create external service error (for tutor service, etc)
 */
export function externalServiceError(service, message) {
  return new ApiError(
    ErrorCodes.EXTERNAL_SERVICE_ERROR,
    `${service}: ${message}`,
    503,
  );
}

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error(`❌ [${new Date().toISOString()}] Error:`, err.message);

  // Handle ApiError
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      ok: false,
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      ok: false,
      error: ErrorCodes.VALIDATION_ERROR,
      message: "Invalid JSON in request body",
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    ok: false,
    error: ErrorCodes.INTERNAL_ERROR,
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
  });
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: ErrorCodes.NOT_FOUND,
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  ErrorCodes,
  ApiError,
  validationError,
  notFoundError,
  databaseError,
  externalServiceError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
