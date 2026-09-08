'use strict';
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, RefreshToken } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../services/audit/auditService');

function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

function signRefresh(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password are required');

  const user = await User.scope('withSecret').findOne({ where: { email: String(email).toLowerCase() } });
  if (!user || user.status !== 'active') {
    throw ApiError.unauthorized('Invalid credentials');
  }
  const ok = await user.validatePassword(password);
  if (!ok) {
    await audit.record(req, 'auth.login.failed', { resourceType: 'user', resourceId: user.id });
    throw ApiError.unauthorized('Invalid credentials');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user);
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  });

  await audit.record(req, 'auth.login', { resourceType: 'user', resourceId: user.id });
  res.json({ accessToken, refreshToken, user: user.toSafeJSON() });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('refreshToken required');
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch (e) {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  const stored = await RefreshToken.findOne({
    where: { userId: payload.sub, tokenHash: hashToken(refreshToken), revokedAt: null },
  });
  if (!stored) throw ApiError.unauthorized('Refresh token not recognized');

  const user = await User.findByPk(payload.sub);
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Account not available');
  res.json({ accessToken: signAccess(user) });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash: hashToken(refreshToken) } });
  }
  await audit.record(req, 'auth.logout');
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 10) {
    throw ApiError.badRequest('New password must be at least 10 characters');
  }
  const user = await User.scope('withSecret').findByPk(req.user.id);
  // First-login change is allowed to skip current-password verification.
  if (!user.requiresPasswordChange) {
    const ok = await user.validatePassword(currentPassword || '');
    if (!ok) throw ApiError.unauthorized('Current password is incorrect');
  }
  await user.setPassword(newPassword);
  user.requiresPasswordChange = false;
  await user.save();

  // Revoke existing refresh tokens on password change.
  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });
  await audit.record(req, 'auth.password_changed', { resourceType: 'user', resourceId: user.id });
  res.json({ ok: true });
});

module.exports = { login, refresh, logout, me, changePassword };
