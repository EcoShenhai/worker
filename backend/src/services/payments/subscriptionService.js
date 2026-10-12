'use strict';

const { Tenant } = require('../../models');

const fxRate = require('../../fxRate');

// Prices are set in USD (one price worldwide). The M-Pesa amount is USD x today's shared rate, worked out
// when it is needed, never fixed in code.
const plan = (usd) => ({ usd, get kes() { return Math.ceil(usd * fxRate.kesPerUsd()); } });
const PLANS = {
  starter: plan(10),
  professional: plan(20),
  business: plan(50),
};

/** The KES amount for a plan. For an M-Pesa payment already made, its own amount when it matches the plan
 *  (today's rate within 25%, or the old fixed 130 KES/USD that earlier mandates were created with). */
function kesFor(planId, payment) {
  const p = PLANS[planId]; if (!p) return null;
  const now = p.kes;
  const amt = payment ? Number(payment.amount) : NaN;
  if (payment && payment.provider === 'mpesa' && String(payment.currency || '').toUpperCase() === 'KES' && amt > 0) {
    if (amt === p.usd * 130 || Math.abs(amt - now) / now <= 0.25) return amt;
  }
  return now;
}

async function activateFromPayment(payment) {
  if (!payment || payment.status !== 'completed') return null;
  if (!payment.tenantId) return null;
  if (!payment.metadata || payment.metadata.type !== 'subscription') return null;

  const plan = payment.metadata.plan;
  if (!PLANS[plan]) return null;

  const expectedCurrency = payment.provider === 'mpesa' ? 'KES' : 'USD';
  const expectedAmount = payment.provider === 'mpesa' ? kesFor(plan, payment) : PLANS[plan].usd;

  if (String(payment.currency).toUpperCase() !== expectedCurrency) return null;
  if (Number(payment.amount) !== expectedAmount) return null;

  const tenant = await Tenant.findByPk(payment.tenantId);
  if (!tenant) return null;

  if (payment.id === tenant.subscriptionPaymentId) {
    return tenant;
  }

  const now = new Date();
  const currentEnd = tenant.subscriptionEndsAt
    ? new Date(tenant.subscriptionEndsAt)
    : null;

  const startedAt =
    tenant.subscriptionStatus === 'active' &&
    currentEnd &&
    currentEnd > now
      ? currentEnd
      : now;

  const endsAt = new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  tenant.subscriptionPlan = plan;
  tenant.subscriptionStatus = 'active';
  tenant.subscriptionStartedAt = tenant.subscriptionStatus === 'active' && currentEnd && currentEnd > now
    ? tenant.subscriptionStartedAt || now
    : now;
  tenant.subscriptionEndsAt = endsAt;
  tenant.paymentProvider = payment.provider;
  tenant.subscriptionPaymentId = payment.id;

  await tenant.save();

  return tenant;
}

module.exports = { PLANS, activateFromPayment, kesFor };
