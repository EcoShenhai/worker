'use strict';
const { Email } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../services/audit/auditService');
const AIService = require('../services/ai/AIService');
const emailService = require('../services/email/emailService');
const { generateReference } = require('../utils/refNumber');
const { scopeWhere, stamp, owns } = require('../utils/tenancy');

const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.direction) where.direction = req.query.direction;
  if (req.query.status) where.status = req.query.status;
  const emails = await Email.findAll({ where: scopeWhere(req, where), order: [['createdAt', 'DESC']], limit: 200 });
  res.json({ emails });
});

const get = asyncHandler(async (req, res) => {
  const email = await Email.findByPk(req.params.id);
  if (!owns(req, email)) throw ApiError.notFound('Email not found');
  res.json({ email });
});

// Create/save a draft (manual or AI-assisted).
const createDraft = asyncHandler(async (req, res) => {
  const { to, cc, subject, body, sessionId } = req.body;
  if (!to || !subject || !body) throw ApiError.badRequest('to, subject and body are required');
  const email = await Email.create({
    direction: 'outgoing',
    toAddress: to,
    cc: cc || null,
    subject,
    body,
    referenceNumber: generateReference('letter'),
    status: 'draft',
    sessionId: sessionId || null,
    ownerId: req.user.id,
    ...stamp(req, {}),
  });
  await audit.record(req, 'email.draft', { resourceType: 'email', resourceId: email.id });
  res.status(201).json({ email });
});

// AI draft/reply. Produces a draft only — never sends.
const aiDraft = asyncHandler(async (req, res) => {
  const { to, subject, intent, context, incomingBody } = req.body;
  if (!intent && !context && !incomingBody) throw ApiError.badRequest('Provide intent/context or incomingBody');
  const prompt = incomingBody
    ? `Draft a formal government reply to this correspondence. Intent: ${intent || 'acknowledge and respond appropriately'}.\n\nIncoming message:\n${incomingBody}\n\nReturn JSON {"subject":string,"body":string}.`
    : `Draft a formal government email. Intent: ${intent}. Context: ${context}.\nReturn JSON {"subject":string,"body":string}.`;
  const { data } = await AIService.generateJson(prompt);
  const email = await Email.create({
    direction: 'outgoing',
    toAddress: to || '[TO BE CONFIRMED]',
    subject: subject || data.subject,
    body: data.body,
    referenceNumber: generateReference('letter'),
    status: 'draft',
    aiAssisted: true,
    ownerId: req.user.id,
    ...stamp(req, {}),
  });
  await audit.record(req, 'email.ai_draft', { resourceType: 'email', resourceId: email.id });
  res.status(201).json({ email });
});

const updateDraft = asyncHandler(async (req, res) => {
  const email = await Email.findByPk(req.params.id);
  if (!owns(req, email)) throw ApiError.notFound('Email not found');
  if (email.status === 'sent') throw ApiError.conflict('Sent emails cannot be edited');
  ['toAddress', 'cc', 'subject', 'body'].forEach((f) => {
    const k = f === 'toAddress' ? 'to' : f;
    if (req.body[k] !== undefined) email[f] = req.body[k];
  });
  await email.save();
  res.json({ email });
});

// Explicit human send. Records full audit trail.
const send = asyncHandler(async (req, res) => {
  const email = await Email.findByPk(req.params.id);
  if (!owns(req, email)) throw ApiError.notFound('Email not found');
  if (email.status === 'sent') throw ApiError.conflict('Already sent');

  const finalBody = req.body.finalBody || email.body;
  try {
    await emailService.send({ to: email.toAddress, cc: email.cc, subject: email.subject, body: finalBody });
    email.status = 'sent';
    email.finalEditedBody = finalBody;
    email.sentAt = new Date();
    email.sentById = req.user.id;
    await email.save();
    await audit.record(req, 'email.sent', {
      resourceType: 'email',
      resourceId: email.id,
      metadata: { to: email.toAddress, aiAssisted: email.aiAssisted },
    });
    res.json({ email });
  } catch (e) {
    email.status = 'failed';
    await email.save();
    throw e;
  }
});

module.exports = { list, get, createDraft, aiDraft, updateDraft, send };
