/**
 * Error Handling Utilities
 * 
 * LEARNING NOTES:
 * - Custom error classes help distinguish error types
 * - Makes error handling cleaner and more semantic
 * - Each error type can have different handling logic
 */

/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
  constructor(resource, identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404);
  }
}

/**
 * Database Error (500)
 */
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * Duplicate Entry Error (409)
 */
class DuplicateError extends AppError {
  constructor(resource, field = null) {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(message, 409);
  }
}

/**
 * Business Logic Error (422)
 */
class BusinessLogicError extends AppError {
  constructor(message) {
    super(message, 422);
  }
}

/**
 * Error Handler Function
 * Formats errors consistently for display
 */
function handleError(error, logger) {
  if (error instanceof AppError && error.isOperational) {
    // Expected operational errors
    logger.error(error.message);
    return {
      success: false,
      error: error.message,
      code: error.statusCode
    };
  } else {
    // Unexpected programming errors
    logger.error('Unexpected error occurred:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 500
    };
  }
}

/**
 * Async Handler Wrapper
 * Catches async errors and passes to error handler
 */
function asyncHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw error;
    }
  };
}

/**
 * MongoDB Error Parser
 * Converts MongoDB errors to our custom errors
 */
function parseMongoError(error) {
  // Duplicate key error (E11000)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return new DuplicateError('Entry', field);
  }

  // Validation error
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message);
  }

  // Network/Connection errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
    return new DatabaseError('Database connection error', error);
  }

  // Default database error
  return new DatabaseError(error.message, error);
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  DuplicateError,
  BusinessLogicError,
  handleError,
  asyncHandler,
  parseMongoError
};