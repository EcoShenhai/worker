'use strict';

const { Tenant } = require('../../models');

const PLANS = {
  starter: { usd: 10, kes: 1300 },
  professional: { usd: 20, kes: 2600 },
  business: { usd: 50, kes: 6500 },
};

async function activateFromPayment(payment) {
  if (!payment || payment.status !== 'completed') return null;
  if (!payment.tenantId) return null;
  if (!payment.metadata || payment.metadata.type !== 'subscription') return null;

  const plan = payment.metadata.plan;
  if (!PLANS[plan]) return null;

  const expectedCurrency = payment.provider === 'mpesa' ? 'KES' : 'USD';
  const expectedAmount = PLANS[plan][payment.provider === 'mpesa' ? 'kes' : 'usd'];

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

module.exports = { PLANS, activateFromPayment };
