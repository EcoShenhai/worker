'use strict';
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, RefreshToken } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../services/audit/auditService');
const codeService = require('../services/auth/codeService');

const MIN_PASSWORD = 8;

function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.accessExpiresIn });
}
function signRefresh(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
}
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokens(req, user) {
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
  return { accessToken, refreshToken, user: user.toSafeJSON() };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw ApiError.badRequest('Name, email and password are required');
  if (String(password).length < MIN_PASSWORD) throw ApiError.badRequest(`Password must be at least ${MIN_PASSWORD} characters`);
  const normEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ where: { email: normEmail } });
  if (existing) throw ApiError.conflict('An account with this email already exists');
  const user = User.build({ name: String(name).trim(), email: normEmail, role: 'officer', status: 'active' });
  await user.setPassword(String(password));
  user.emailVerified = false;
  await user.save();
  await codeService.issueCode({ userId: user.id, email: user.email, name: user.name, purpose: 'verify_email' });
  await audit.record(req, 'auth.register', { resourceType: 'user', resourceId: user.id });
  res.status(201).json({ userId: user.id, email: user.email, next: 'verify_email' });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) throw ApiError.badRequest('userId and code are required');
  const user = await User.scope('withSecret').findByPk(userId);
  if (!user) throw ApiError.badRequest('Invalid or expired code');
  const ok = await codeService.verifyCode({ userId: user.id, purpose: 'verify_email', code });
  if (!ok) throw ApiError.badRequest('Invalid or expired code');
  user.emailVerified = true;
  await user.save();
  await audit.record(req, 'auth.email_verified', { resourceType: 'user', resourceId: user.id });
  res.json({ ok: true, next: 'login' });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password are required');
  const user = await User.scope('withSecret').findOne({ where: { email: String(email).toLowerCase() } });
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Invalid credentials');
  const ok = await user.validatePassword(password);
  if (!ok) {
    await audit.record(req, 'auth.login.failed', { resourceType: 'user', resourceId: user.id });
    throw ApiError.unauthorized('Invalid credentials');
  }
  if (!user.emailVerified) {
    await codeService.issueCode({ userId: user.id, email: user.email, name: user.name, purpose: 'verify_email' });
    return res.json({ userId: user.id, next: 'verify_email', message: 'Your email is not verified yet. We have sent a verification code.' });
  }
  await codeService.issueCode({ userId: user.id, email: user.email, name: user.name, purpose: 'login' });
  res.json({ userId: user.id, next: 'mfa', message: 'We sent a sign-in code to your email.' });
});

const verifyMfa = asyncHandler(async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) throw ApiError.badRequest('userId and code are required');
  const user = await User.scope('withSecret').findByPk(userId);
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Account not available');
  const ok = await codeService.verifyCode({ userId: user.id, purpose: 'login', code });
  if (!ok) throw ApiError.unauthorized('Invalid or expired code');
  const out = await issueTokens(req, user);
  res.json(out);
});

const resendCode = asyncHandler(async (req, res) => {
  const { userId, purpose } = req.body;
  const allowed = ['verify_email', 'login'];
  if (!userId || !allowed.includes(purpose)) throw ApiError.badRequest('Valid userId and purpose are required');
  const user = await User.findByPk(userId);
  if (!user || user.status !== 'active') throw ApiError.badRequest('Unable to resend code');
  await codeService.issueCode({ userId: user.id, email: user.email, name: user.name, purpose });
  res.json({ ok: true });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest('Email is required');
  const user = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (user && user.status === 'active') {
    await codeService.issueCode({ userId: user.id, email: user.email, name: user.name, purpose: 'reset_password' });
    await audit.record(req, 'auth.forgot_password', { resourceType: 'user', resourceId: user.id });
  }
  res.json({ ok: true, message: 'If an account exists for that email, a reset code has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) throw ApiError.badRequest('Email, code and new password are required');
  if (String(newPassword).length < MIN_PASSWORD) throw ApiError.badRequest(`Password must be at least ${MIN_PASSWORD} characters`);
  const user = await User.scope('withSecret').findOne({ where: { email: String(email).toLowerCase() } });
  const ok = user ? await codeService.verifyCode({ userId: user.id, purpose: 'reset_password', code }) : false;
  if (!ok) throw ApiError.badRequest('Invalid or expired code');
  await user.setPassword(String(newPassword));
  user.requiresPasswordChange = false;
  if (!user.emailVerified) user.emailVerified = true;
  await user.save();
  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });
  await audit.record(req, 'auth.password_reset', { resourceType: 'user', resourceId: user.id });
  res.json({ ok: true, next: 'login' });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('refreshToken required');
  let payload;
  try { payload = jwt.verify(refreshToken, config.jwt.refreshSecret); }
  catch (e) { throw ApiError.unauthorized('Invalid refresh token'); }
  const stored = await RefreshToken.findOne({ where: { userId: payload.sub, tokenHash: hashToken(refreshToken), revokedAt: null } });
  if (!stored) throw ApiError.unauthorized('Refresh token not recognized');
  const user = await User.findByPk(payload.sub);
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Account not available');
  res.json({ accessToken: signAccess(user) });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash: hashToken(refreshToken) } });
  await audit.record(req, 'auth.logout');
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 10) throw ApiError.badRequest('New password must be at least 10 characters');
  const user = await User.scope('withSecret').findByPk(req.user.id);
  if (!user.requiresPasswordChange) {
    const ok = await user.validatePassword(currentPassword || '');
    if (!ok) throw ApiError.unauthorized('Current password is incorrect');
  }
  await user.setPassword(newPassword);
  user.requiresPasswordChange = false;
  await user.save();
  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });
  await audit.record(req, 'auth.password_changed', { resourceType: 'user', resourceId: user.id });
  res.json({ ok: true });
});

module.exports = {
  register, verifyEmail, login, verifyMfa, resendCode, forgotPassword, resetPassword,
  refresh, logout, me, changePassword,
};
