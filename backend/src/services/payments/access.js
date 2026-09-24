'use strict';

// Workspace access after a trial or paid period ends:
//   running -> full | ended, within grace (GRACE_DAYS) -> full + banner | past grace -> read-only
// Read-only still allows viewing, exporting, signing in, payments/billing/support and choosing a plan.
// Nothing is ever deleted; payment restores full access.
const config = require('../../config');
const ApiError = require('../../utils/apiError');

const DAY_MS = 24 * 60 * 60 * 1000;
const graceDays = () => (config.trial && config.trial.graceDays > 0 ? config.trial.graceDays : 14);

function accessFor(tenant, now = new Date()) {
  if (!tenant) return { mode: 'full', state: 'none' };
  const status = tenant.subscriptionStatus;
  const paidEnd = tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt) : null;
  const trialEnd = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;

  if (status === 'active' && (!paidEnd || now < paidEnd)) return { mode: 'full', state: 'active', endsAt: paidEnd };
  if (status === 'trialing' && (!trialEnd || now < trialEnd)) return { mode: 'full', state: 'trial', endsAt: trialEnd };

  const endedAt = status === 'active' ? paidEnd : (trialEnd || paidEnd);
  if (!endedAt) return { mode: 'full', state: 'unknown' }; // never lock anyone out on missing data
  const graceEndsAt = new Date(endedAt.getTime() + graceDays() * DAY_MS);
  if (now < graceEndsAt) {
    return { mode: 'full', state: 'grace', endedAt, graceEndsAt, daysLeft: Math.ceil((graceEndsAt - now) / DAY_MS) };
  }
  return { mode: 'read_only', state: 'read_only', endedAt, graceEndsAt };
}

// Writes that stay allowed while read-only.
const WRITE_ALLOWED = [
  /^\/api\/auth\//,
  /^\/api\/payments\//,
  /^\/api\/billing\//,
  /^\/api\/support\//,
  /^\/api\/tenant\/subscription$/,
  /^\/api\/documents\/[^/]+\/export(-pdf|-pptx|-xlsx)?$/,
];
const isWriteAllowed = (path) => WRITE_ALLOWED.some((re) => re.test(path));

const TTL_MS = 30 * 1000;
const cache = new Map();
async function tenantCached(tenantId) {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.tenant;
  const { Tenant } = require('../../models');
  const tenant = await Tenant.findByPk(tenantId, {
    attributes: ['id', 'subscriptionStatus', 'trialEndsAt', 'subscriptionEndsAt'],
  });
  cache.set(tenantId, { tenant, at: Date.now() });
  return tenant;
}
const invalidate = (tenantId) => cache.delete(tenantId);

function readOnlyError() {
  const e = ApiError.badRequest(
    'Your workspace is read-only because your trial or subscription has ended. ' +
      'You can still view and export your documents. Choose a plan to continue.'
  );
  if ('statusCode' in e) e.statusCode = 402;
  if ('status' in e) e.status = 402;
  e.code = 'WORKSPACE_READ_ONLY';
  return e;
}

// Called by authenticate() right after req.user is set.
async function enforceWriteAccess(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const user = req.user;
  if (!user || user.role === 'superadmin' || !user.tenantId) return;
  const path = String(req.originalUrl || '').split('?')[0];
  if (isWriteAllowed(path)) return;
  const access = accessFor(await tenantCached(user.tenantId));
  req.access = access;
  if (access.mode === 'read_only') throw readOnlyError();
}

module.exports = { accessFor, enforceWriteAccess, isWriteAllowed, invalidate, graceDays };
