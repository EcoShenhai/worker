'use strict';
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

// 404 for unmatched routes.
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler. Never leaks internals or request bodies to logs.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  if (status >= 500) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.path });
  } else {
    logger.warn('Request error', { message: err.message, status, path: req.path });
  }
  res.status(status).json({
    error: { message: err.message || 'Internal server error', details: err.details || null },
  });
}

module.exports = { notFound, errorHandler };
