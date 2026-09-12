'use strict';
const path = require('path');
const fs = require('fs/promises');
const { Tenant } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../services/audit/auditService');
const storage = require('../services/storage/storageService');

async function myTenant(req) {
  if (!req.user.tenantId) return null;
  return Tenant.findByPk(req.user.tenantId);
}

const get = asyncHandler(async (req, res) => {
  const t = await myTenant(req);
  if (!t) return res.json({ tenant: null });
  res.json({
    tenant: {
      id: t.id, name: t.name,
      letterheadLine1: t.letterheadLine1, letterheadLine2: t.letterheadLine2, letterheadLine3: t.letterheadLine3,
      hasLogo: !!t.logoKey, hasSignature: !!t.signatureKey,
      subscriptionPlan: t.subscriptionPlan,
      subscriptionStatus: t.subscriptionStatus,
      trialStartedAt: t.trialStartedAt,
      trialEndsAt: t.trialEndsAt,
      subscriptionStartedAt: t.subscriptionStartedAt,
      subscriptionEndsAt: t.subscriptionEndsAt,
      paymentProvider: t.paymentProvider,
    },
  });
});

const update = asyncHandler(async (req, res) => {
  const t = await myTenant(req);
  if (!t) throw ApiError.badRequest('No tenant associated with this account');
  ['name', 'letterheadLine1', 'letterheadLine2', 'letterheadLine3'].forEach((f) => {
    if (req.body[f] !== undefined) t[f] = req.body[f] === '' ? null : req.body[f];
  });
  if (!t.name) throw ApiError.badRequest('Organisation name is required');
  await t.save();
  await audit.record(req, 'tenant.update', { resourceType: 'tenant', resourceId: t.id });
  res.json({ ok: true });
});

const selectSubscription = asyncHandler(async (req, res) => {
  const t = await myTenant(req);
  if (!t) throw ApiError.badRequest('No tenant associated with this account');

  const allowed = ['starter', 'professional', 'business'];
  const plan = String(req.body.plan || '').toLowerCase();

  if (!allowed.includes(plan)) {
    throw ApiError.badRequest('Invalid subscription plan');
  }

  t.subscriptionPlan = plan;
  await t.save();

  await audit.record(req, 'tenant.subscription.select', {
    resourceType: 'tenant',
    resourceId: t.id,
    metadata: { plan },
  });

  res.json({
    ok: true,
    subscriptionPlan: t.subscriptionPlan,
    subscriptionStatus: t.subscriptionStatus,
  });
});

const uploadImage = (field, prefix) =>
  asyncHandler(async (req, res) => {
    const t = await myTenant(req);
    if (!t) throw ApiError.badRequest('No tenant associated with this account');
    if (!req.file) throw ApiError.badRequest('An image file is required (field name: file)');
    const ext = (path.extname(req.file.originalname || '') || '.png').toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      await fs.unlink(req.file.path).catch(() => {});
      throw ApiError.badRequest('Use a PNG or JPG image');
    }
    const key = storage.datedKey(prefix, ext);
    await storage.saveFromPath(req.file.path, key);
    await fs.unlink(req.file.path).catch(() => {});
    t[field] = key;
    await t.save();
    await audit.record(req, 'tenant.' + prefix, { resourceType: 'tenant', resourceId: t.id });
    res.json({ ok: true });
  });

module.exports = {
  get,
  update,
  selectSubscription,
  uploadLogo: uploadImage('logoKey', 'tenant-logo'),
  uploadSignature: uploadImage('signatureKey', 'tenant-signature'),
};
