'use strict';
/**
 * ShenPort TICKET_RESOLVED -> Worker Support Inbox.
 * Only Worker tickets (ticket_ref prefix "WRK-"); TICKET_RESOLVED carries no app_code.
 * IDEMPOTENT: findOrCreate on (ticketRef, kind) + unique index support_messages_ticket_kind_uidx.
 * globalEcoId nullable; never derived from an email address.
 */
const ecobus = require('../config/ecobus');
const logger = require('../utils/logger');

const WORKER_REF = /^WRK-/;

function register() {
  ecobus.subscribe('TICKET_RESOLVED', async (p) => {
    const ref = p.ticket_ref;
    if (!ref || !WORKER_REF.test(ref)) return;
    const { SupportMessage } = require('../models');
    try {
      const [row, created] = await SupportMessage.findOrCreate({
        where: { ticketRef: ref, kind: 'TICKET_RESOLVED' },
        defaults: { ticketRef: ref, kind: 'TICKET_RESOLVED', globalEcoId: p.global_eco_id || null, territoryCode: p.territory_code || 'KE',
          resolution: String(p.resolution || ''), resolvedBy: p.resolved_by || null, resolvedAt: p.resolved_at ? new Date(p.resolved_at) : new Date(), certified: p.certified === true },
      });
      logger.info(created ? `[support-inbox] stored TICKET_RESOLVED (${ref})` : `[support-inbox] duplicate TICKET_RESOLVED ignored (${ref}) id=${row.id}`);
    } catch (e) {
      if (e && e.name === 'SequelizeUniqueConstraintError') return logger.info(`[support-inbox] duplicate TICKET_RESOLVED ignored (${ref})`);
      throw e;
    }
  });
}
module.exports = { register };
