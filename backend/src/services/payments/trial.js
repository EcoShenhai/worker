'use strict';

// Single source of truth for new-tenant trial dates (used by every sign-up path).
const config = require('../../config');

const DAY_MS = 24 * 60 * 60 * 1000;

function trialDates(now = new Date()) {
  const days = config.trial && config.trial.days > 0 ? config.trial.days : 14;
  return {
    subscriptionStatus: 'trialing',
    trialStartedAt: now,
    trialEndsAt: new Date(now.getTime() + days * DAY_MS),
  };
}

module.exports = { trialDates };
