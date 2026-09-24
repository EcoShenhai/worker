'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { enforceWriteAccess } = require('../services/payments/access');

// Verifies the access token and attaches req.user (safe fields only).
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Missing access token');

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (e) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findByPk(payload.sub);
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Account not available');

  req.user = user;
  await enforceWriteAccess(req); // read-only after trial/subscription + grace
  req.tokenPayload = payload;
  next();
});

module.exports = { authenticate };
