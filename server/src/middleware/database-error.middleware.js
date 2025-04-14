// server/src/middleware/database-error.middleware.js
const mongoose = require('mongoose');

/**
 * Database error handler middleware
 */
exports.databaseErrorHandler = (err, req, res, next) => {
  // If it's not a MongoDB/Mongoose error, pass it on
  if (!(err instanceof mongoose.Error) &&
    !(err.name && err.name.includes('Mongo'))) {
    return next(err);
  }

  console.error('Database error:', err);

  // Validation error
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.keys(err.errors).reduce((result, field) => {
        result[field] = err.errors[field].message;
        return result;
      }, {})
    });
  }

  // Cast error (invalid ID format)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      error: 'Invalid Data Format',
      message: `Invalid ${err.path}: ${err.value}`,
      path: err.path
    });
  }

  // Duplicate key error
  if (err.name === 'MongoError' && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      error: 'Duplicate Key Error',
      message: `The ${field} '${err.keyValue[field]}' already exists`,
      field
    });
  }

  // Document not found error
  if (err instanceof mongoose.Error.DocumentNotFoundError) {
    return res.status(404).json({
      error: 'Document Not Found',
      message: err.message
    });
  }

  // Connection/timeout error
  if (err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      error: 'Database Connection Error',
      message: 'Unable to connect to database. Please try again later.'
    });
  }

  // Default database error response
  return res.status(500).json({
    error: 'Database Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected database error occurred'
  });
};
