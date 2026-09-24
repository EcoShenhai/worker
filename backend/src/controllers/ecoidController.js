'use strict';
const { normTerritory, normLanguage, defaultLanguageFor } = require('../utils/international');
const { trialDates } = require('../services/payments/trial');
/**
 * "Continue with EcoID" for Worker — additive; email + password + emailed code is unchanged.
 * exchange: EcoID token -> the SAME access/refresh tokens as verifyMfa (reuses issueTokens).
 * register: first EcoID login -> new workspace (tenant) with the user as its admin, exactly like
 *           self-registration. Email from EcoID userinfo only; existing emails are never auto-linked.
 * link/unlink/status: signed-in users (e.g. invited officers/viewers) attach their EcoID.
 * Superadmins cannot sign in via EcoID (blueprint Rule 7).
 */
const crypto = require('crypto');
const { User, Tenant } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { issueTokens } = require('./authController');
const { verifyEcoIdToken, fetchUserInfo } = require('../services/ecoidService');
const audit = (() => { try { return require('../services/audit/auditService'); } catch { return null; } })();

const UNVERIFIED = 'Your EcoID sign-in could not be verified. Please try again.';
const claimsOrNull = async (t) => { try { return await verifyEcoIdToken(t); } catch { return null; } };
async function profileOrNull(t) {
  try {
    const u = await fetchUserInfo(t);
    const name = u.name || [u.given_name, u.family_name].filter(Boolean).join(' ') || null;
    return { email: u.email ? String(u.email).trim().toLowerCase() : null, emailVerified: u.email_verified !== false, name: name ? String(name).trim() : null };
  } catch { return null; }
}
const record = async (req, action, userId) => { try { if (audit && audit.record) await audit.record(req, action, { resourceType: 'user', resourceId: userId }); } catch { /* audit is best-effort */ } };

const exchange = asyncHandler(async (req, res) => {
  const token = req.body && req.body.ecoidToken;
  const claims = await claimsOrNull(token);
  if (!claims) return res.status(401).json({ message: UNVERIFIED });
  const user = await User.findOne({ where: { globalEcoId: claims.sub } });
  if (!user) {
    const p = await profileOrNull(token);
    return res.json({ needsOnboarding: true, email: (p && p.email) || null, name: (p && p.name) || null });
  }
  if (user.status !== 'active') return res.status(403).json({ message: 'Account not available' });
  if (user.role === 'superadmin') return res.status(403).json({ message: 'Superadmin accounts sign in with email and password.' });
  const out = await issueTokens(req, user);
  await record(req, 'auth.login.ecoid', user.id);
  return res.json({ ...out, authSource: 'ecoid' });
});

const register = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const claims = await claimsOrNull(b.ecoidToken);
  if (!claims) return res.status(401).json({ message: UNVERIFIED });
  if (await User.findOne({ where: { globalEcoId: claims.sub } })) {
    return res.status(409).json({ message: 'This EcoID already has a Worker account. Sign in instead.', code: 'ALREADY_REGISTERED' });
  }
  const profile = await profileOrNull(b.ecoidToken);
  if (!profile || !profile.email) return res.status(400).json({ message: 'We could not read an email address from your EcoID account. Add one in EcoID, then try again.' });
  if (!profile.emailVerified) return res.status(400).json({ message: 'Please verify your email address in EcoID first, then try again.' });
  const name = String(b.name || profile.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Full name is required.' });
  if (await User.findOne({ where: { email: profile.email } })) {
    return res.status(409).json({ message: 'A Worker account with this email already exists. Sign in with your email and password, then link EcoID from your account.', code: 'EMAIL_EXISTS' });
  }
  const workspace = String(b.workspaceName || '').trim() || `${name} (Workspace)`;
  const territory = normTerritory(b.territory, { required: true });
  const defaultLanguage = normLanguage(b.language) || (territory ? defaultLanguageFor(territory) : null);

  const user = User.build({ name, email: profile.email, role: 'admin', status: 'active', globalEcoId: claims.sub });
  await user.setPassword(crypto.randomBytes(32).toString('base64url')); // unusable; owner may set one via "Forgot password"
  user.emailVerified = true; // verified by EcoID
  await user.save();
  const tenant = await Tenant.create({ name: workspace, ownerId: user.id, territory, defaultLanguage, ...trialDates() });
  user.tenantId = tenant.id;
  await user.save();
  await record(req, 'auth.register.ecoid', user.id);
  const out = await issueTokens(req, user);
  return res.status(201).json({ ...out, authSource: 'ecoid' });
});

const status = asyncHandler(async (req, res) => res.json({ linked: !!req.user.globalEcoId }));

const link = asyncHandler(async (req, res) => {
  const claims = await claimsOrNull(req.body && req.body.ecoidToken);
  if (!claims) return res.status(401).json({ message: UNVERIFIED });
  if (req.user.globalEcoId === claims.sub) return res.json({ linked: true, alreadyLinked: true });
  if (req.user.globalEcoId) return res.status(409).json({ message: 'Your account is already linked to a different EcoID.' });
  if (await User.findOne({ where: { globalEcoId: claims.sub } })) return res.status(409).json({ message: 'This EcoID is already linked to another Worker account.' });
  req.user.globalEcoId = claims.sub;
  try { await req.user.save({ fields: ['globalEcoId'] }); }
  catch (e) { if (e && e.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'This EcoID is already linked to another Worker account.' }); throw e; }
  await record(req, 'auth.ecoid.linked', req.user.id);
  return res.json({ linked: true });
});

const unlink = asyncHandler(async (req, res) => {
  req.user.globalEcoId = null;
  await req.user.save({ fields: ['globalEcoId'] });
  await record(req, 'auth.ecoid.unlinked', req.user.id);
  return res.json({ linked: false });
});

module.exports = { exchange, register, status, link, unlink };
