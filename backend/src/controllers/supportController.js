'use strict';
/**
 * Dual support (in-app + email -> ShenPort). Worker never calls ShenPort directly.
 * Linked EcoID users: SUPPORT_TICKET_CREATED over EcoBus (schema requires global_eco_id) + email.
 * Unlinked users: email route to support@theshenhai.com (ShenPort IMAP) — same authority.
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const { SupportTicket, SupportMessage } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const ecobus = require('../config/ecobus');
const logger = require('../utils/logger');

const APP_CODE = 'WORKER';
const SUPPORT_EMAIL = 'support@theshenhai.com';
const newRef = () => `WRK-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const createTicket = asyncHandler(async (req, res) => {
  const subject = String((req.body && req.body.subject) || '').trim().slice(0, 240);
  const body = String((req.body && req.body.body) || '').trim().slice(0, 4000);
  if (!subject) throw ApiError.badRequest('Please add a subject.');
  const user = req.user; const linked = !!user.globalEcoId; const ticketRef = newRef();
  const ticket = await SupportTicket.create({ ticketRef, userId: user.id, tenantId: user.tenantId || null, globalEcoId: user.globalEcoId || null,
    customerEmail: user.email, subject, body, channel: linked ? 'BOTH' : 'EMAIL', ecobusDelivered: false });
  let delivered = false;
  if (linked) {
    const payload = { ticket_ref: ticketRef, global_eco_id: user.globalEcoId, customer_email: user.email, app_code: APP_CODE, territory_code: 'KE', subject, body, channel: 'BOTH' };
    try {
      await ecobus.publish('SUPPORT_TICKET_CREATED', payload, { partitionKey: ticketRef });
      delivered = true; ticket.ecobusDelivered = true; await ticket.save({ fields: ['ecobusDelivered'] });
    } catch (e) { logger.error(`[support] SUPPORT_TICKET_CREATED publish failed (non-fatal; email route remains): ${e.message}`); }
  }
  res.status(201).json({ ticketRef, subject, channel: ticket.channel, ecobusDelivered: delivered, ecoidLinked: linked, supportEmail: SUPPORT_EMAIL, appCode: APP_CODE });
});

const listInbox = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']], limit: 50 });
  const refs = tickets.map((t) => t.ticketRef);
  const messages = refs.length ? await SupportMessage.findAll({ where: { ticketRef: { [Op.in]: refs } } }) : [];
  const byRef = Object.fromEntries(messages.map((m) => [m.ticketRef, m]));
  res.json({
    supportEmail: SUPPORT_EMAIL, ecoidLinked: !!req.user.globalEcoId,
    tickets: tickets.map((t) => { const m = byRef[t.ticketRef]; return { ticketRef: t.ticketRef, subject: t.subject, channel: t.channel, ecobusDelivered: t.ecobusDelivered,
      createdAt: t.createdAt, status: m ? 'resolved' : 'open', resolution: m ? m.resolution : null, resolvedAt: m ? m.resolvedAt : null }; }),
  });
});

const ecobusStatus = asyncHandler(async (req, res) => res.json(ecobus.stats()));
module.exports = { createTicket, listInbox, ecobusStatus };
