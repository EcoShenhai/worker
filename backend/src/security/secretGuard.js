'use strict';
// Fail-closed JWT/session secret resolver. In production a missing or known-default secret throws at startup,
// so a forged-token path can never open. Outside production an ephemeral per-boot secret keeps local dev working.
const crypto = require('crypto');
const KNOWN_DEFAULTS = new Set([
  'dev-only-change-me', 'your_super_secret_jwt_key_change_in_production', 'dev-ecoid-shared-secret-change-me',
  'dev_only_change_me', 'change-me-in-production', 'dev-jwt-secret', 'changeme', 'secret', 'your-secret-key',
]);
function requireSecret(value, name = 'JWT_SECRET') {
  const prod = process.env.NODE_ENV === 'production';
  const v = value == null ? '' : String(value);
  if (!v || KNOWN_DEFAULTS.has(v) || v.length < 16) {
    if (prod) throw new Error(`[security] ${name} is missing, too short, or a known default — refusing to start in production. Set a strong ${name}.`);
    const ephemeral = crypto.randomBytes(48).toString('base64url');
    console.warn(`[security] ${name} weak/missing; using an ephemeral dev secret (tokens invalid on restart). Set ${name} for stable dev sessions.`);
    return ephemeral;
  }
  return v;
}
module.exports = { requireSecret, KNOWN_DEFAULTS };
