'use strict';
// Tenancy helpers. Superadmin (tenantId null, role superadmin) bypasses scoping
// and can see across all tenants. Everyone else is strictly confined to their
// own tenantId. Creates are stamped; per-record fetches are ownership-checked.

function isSuper(req) {
  return req.user && req.user.role === 'superadmin';
}

// Merge a tenant filter into a `where` clause for list/find queries.
function scopeWhere(req, where = {}) {
  if (isSuper(req)) return where;
  return { ...where, tenantId: req.user.tenantId || null };
}

// Stamp tenantId onto values for create(). Superadmin-created rows stay platform
// (tenantId null) unless a tenantId is explicitly provided.
function stamp(req, values = {}) {
  if (!isSuper(req)) values.tenantId = req.user.tenantId || null;
  return values;
}

// Return the entity only if it belongs to the caller's tenant (superadmin: always).
// Returns null on mismatch so callers can 404 uniformly (no cross-tenant leak).
function owns(req, entity) {
  if (!entity) return null;
  if (isSuper(req)) return entity;
  return entity.tenantId && entity.tenantId === req.user.tenantId ? entity : null;
}

module.exports = { isSuper, scopeWhere, stamp, owns };
