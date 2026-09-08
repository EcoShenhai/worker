'use strict';
const { AuditLog } = require('../../models');
const logger = require('../../utils/logger');

/**
 * Record an auditable event. Metadata is limited to identifiers and status —
 * NEVER document bodies, audio, transcripts or credentials.
 */
async function record(req, action, { resourceType, resourceId, metadata } = {}) {
  try {
    await AuditLog.create({
      userId: req && req.user ? req.user.id : null,
      action,
      resourceType: resourceType || null,
      resourceId: resourceId != null ? String(resourceId) : null,
      metadata: metadata || {},
      ipAddress: req ? (req.ip || req.headers['x-forwarded-for'] || null) : null,
      userAgent: req ? (req.headers['user-agent'] || null) : null,
    });
  } catch (e) {
    // Auditing must never break the request path.
    logger.error('Audit write failed', { action, message: e.message });
  }
}

module.exports = { record };
