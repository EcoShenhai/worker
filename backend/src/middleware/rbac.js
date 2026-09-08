'use strict';
const ApiError = require('../utils/apiError');

// Role hierarchy for coarse checks. superadmin implies all.
const RANK = { viewer: 1, officer: 2, admin: 3, superadmin: 4 };

// requireRole('admin') -> admin & superadmin pass.
function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if ((RANK[req.user.role] || 0) < (RANK[minRole] || 99)) {
      return next(ApiError.forbidden('Insufficient role'));
    }
    next();
  };
}

// requireAny('officer','admin') -> exact-role allowlist.
function requireAny(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'superadmin' || roles.includes(req.user.role)) return next();
    return next(ApiError.forbidden('Insufficient role'));
  };
}

module.exports = { requireRole, requireAny, RANK };
