'use strict';
const nodemailer = require('nodemailer');
const config = require('../../config');
const logger = require('../../utils/logger');
const ApiError = require('../../utils/apiError');

/**
 * SMTP transport shared by:
 * - human-reviewed correspondence
 * - system-generated transactional notifications
 *
 * AI-generated correspondence is never sent automatically.
 */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.email.smtpHost) {
    throw ApiError.internal('SMTP is not configured (SMTP_HOST missing).');
  }
  transporter = nodemailer.createTransport({
    host: config.email.smtpHost,
    port: config.email.smtpPort,
    secure: config.email.smtpSecure,
    auth: config.email.smtpUser ? { user: config.email.smtpUser, pass: config.email.smtpPass } : undefined,
  });
  return transporter;
}

async function send({ to, cc, subject, body }) {
  const t = getTransporter();
  const from = config.email.fromAddress
    ? `"${config.email.fromName}" <${config.email.fromAddress}>`
    : config.email.smtpUser;
  const info = await t.sendMail({ from, to, cc: cc || undefined, subject, text: body });
  logger.info('Email sent', { messageId: info.messageId });
  return { messageId: info.messageId };
}

async function sendTransactional({ to, subject, body }) {
  const t = getTransporter();
  const from = config.email.fromAddress
    ? `\"${config.email.fromName}\" <${config.email.fromAddress}>`
    : config.email.smtpUser;

  const info = await t.sendMail({
    from,
    to,
    subject,
    text: body,
  });

  logger.info('Transactional email sent', {
    messageId: info.messageId,
    type: 'transactional',
  });

  return { messageId: info.messageId };
}

async function verify() {
  return getTransporter().verify();
}

module.exports = { send, sendTransactional, verify };
