'use strict';
const { User, AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const audit = require('../services/audit/auditService');
const crypto = require('crypto');

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ users });
});

const createUser = asyncHandler(async (req, res) => {
  const { email, name, role, department, password } = req.body;
  if (!email || !name) throw ApiError.badRequest('email and name are required');
  if (role === 'superadmin') throw ApiError.forbidden('Cannot create another superadmin here');
  const exists = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (exists) throw ApiError.conflict('A user with that email already exists');

  const user = User.build({ email, name, role: role || 'officer', department: department || null, requiresPasswordChange: true });
  // If no password supplied, generate a random one; admin must communicate it, user changes on first login.
  const initial = password || crypto.randomBytes(9).toString('base64url');
  await user.setPassword(initial);
  await user.save();
  await audit.record(req, 'admin.user_create', { resourceType: 'user', resourceId: user.id, metadata: { role: user.role } });
  res.status(201).json({ user: user.toSafeJSON(), initialPassword: password ? undefined : initial });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'superadmin' && req.user.role !== 'superadmin') throw ApiError.forbidden();
  ['name', 'role', 'department', 'status'].forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });
  if (req.body.role === 'superadmin') throw ApiError.forbidden('Cannot elevate to superadmin');
  await user.save();
  await audit.record(req, 'admin.user_update', { resourceType: 'user', resourceId: user.id });
  res.json({ user: user.toSafeJSON() });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'superadmin') throw ApiError.forbidden('Cannot delete the superadmin');
  await user.destroy();
  await audit.record(req, 'admin.user_delete', { resourceType: 'user', resourceId: req.params.id });
  res.json({ ok: true });
});

const listAudit = asyncHandler(async (req, res) => {
  const logs = await AuditLog.findAll({
    order: [['createdAt', 'DESC']],
    limit: Math.min(parseInt(req.query.limit || '200', 10), 1000),
  });
  res.json({ logs });
});

module.exports = { listUsers, createUser, updateUser, deleteUser, listAudit };
