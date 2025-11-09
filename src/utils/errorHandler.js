/**
 * Error Handling Utilities
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

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource, identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404);
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

class DuplicateError extends AppError {
  constructor(resource, field = null) {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(message, 409);
  }
}

class BusinessLogicError extends AppError {
  constructor(message) {
    super(message, 422);
  }
}

function parseMongoError(error) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return new DuplicateError('Entry', field);
  }

  if (error.name === 'ValidationError') {
    return new ValidationError(error.message);
  }

  if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
    return new DatabaseError('Database connection error', error);
  }

  return new DatabaseError(error.message, error);
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  DuplicateError,
  BusinessLogicError,
  parseMongoError
};