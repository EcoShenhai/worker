'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../../models');
const emailService = require('../email/emailService');
const config = require('../../config');
const logger = require('../../utils/logger');

const { QueryTypes } = require('sequelize');

const CODE_TTL_MINUTES = 10;
const ROUNDS = config.security?.bcryptRounds || 10;

// Human-facing copy per purpose. Kept plain-text and neutral (usable by any
// government tier or ordinary user).
const TEMPLATES = {
  verify_email: {
    subject: 'Verify your Worker account',
    line: 'Use this code to verify your email address and activate your account',
  },
  login: {
    subject: 'Your Worker sign-in code',
    line: 'Use this code to complete your sign-in',
  },
  reset_password: {
    subject: 'Reset your Worker password',
    line: 'Use this code to reset your password',
  },
};

function generateCode() {
  // 6-digit numeric, zero-padded.
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

/**
 * Create a fresh code for a user+purpose (invalidating any prior unconsumed
 * ones), store it hashed, and email it. Returns { expiresAt }.
 */
async function issueCode({ userId, email, name, purpose }) {
  if (!TEMPLATES[purpose]) throw new Error(`Unknown code purpose: ${purpose}`);
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, ROUNDS);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await sequelize.query(
    'UPDATE auth_codes SET "consumedAt" = now() WHERE "userId" = :userId AND purpose = :purpose AND "consumedAt" IS NULL',
    { replacements: { userId, purpose }, type: QueryTypes.UPDATE }
  );
  await sequelize.query(
    'INSERT INTO auth_codes (id, "userId", purpose, "codeHash", "expiresAt", "createdAt") VALUES (:id, :userId, :purpose, :codeHash, :expiresAt, now())',
    { replacements: { id: crypto.randomUUID(), userId, purpose, codeHash, expiresAt }, type: QueryTypes.INSERT }
  );

  const t = TEMPLATES[purpose];
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const body =
    `${greeting}\n\n${t.line}:\n\n    ${code}\n\n` +
    `This code expires in ${CODE_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.\n\n— Worker`;
  await emailService.send({ to: email, subject: t.subject, body });
  logger.info('Auth code issued', { purpose, userId });
  return { expiresAt };
}

/**
 * Verify a submitted code for a user+purpose. On success the code is consumed
 * (single-use) and true is returned; otherwise false.
 */
async function verifyCode({ userId, purpose, code }) {
  const rows = await sequelize.query(
    'SELECT id, "codeHash" FROM auth_codes WHERE "userId" = :userId AND purpose = :purpose AND "consumedAt" IS NULL AND "expiresAt" > now() ORDER BY "createdAt" DESC LIMIT 1',
    { replacements: { userId, purpose }, type: QueryTypes.SELECT }
  );
  if (!rows.length) return false;
  const row = rows[0];
  const ok = await bcrypt.compare(String(code || ''), row.codeHash);
  if (!ok) return false;
  await sequelize.query('UPDATE auth_codes SET "consumedAt" = now() WHERE id = :id', {
    replacements: { id: row.id },
    type: QueryTypes.UPDATE,
  });
  return true;
}

module.exports = { issueCode, verifyCode, generateCode, CODE_TTL_MINUTES };
