'use strict';
/**
 * Worker subscriptions renewed automatically by EcoPay (2026-10-12).
 *
 * Paying for a plan creates an EcoPay MANDATE (PayPal vault / M-Pesa Ratiba),
 * approved once. EcoPay charges every month itself; reconcile() turns each
 * charge into a completed Payment and extends the workspace (invoice, receipt
 * and notification through the existing billing services).
 *
 * Payment.providerRef = "<mandateId>:<period>", metadata.via = 'ecopay-mandate'.
 * Mandate subject: "worker:<tenantId>:<plan>".
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Payment, Tenant } = require('../../models');
const rec = require('./ecopayRecurring');
const { PLANS, activateFromPayment } = require('./subscriptionService');
const { createForSubscriptionPayment } = require('./billingDocumentService');
const { sendSubscriptionPaymentNotification } = require('./subscriptionNotificationService');
const logger = require('../../utils/logger');
const ApiError = require('../../utils/apiError');

const VIA = 'ecopay-mandate';
const GRACE_DAYS = Number(process.env.BILLING_RENEWAL_GRACE_DAYS || 5); // covers EcoPay retries (1d, 3d)
const midOf = (ref) => String(ref || '').split(':')[0];
const isMid = (s) => /^[0-9a-f-]{36}$/i.test(String(s || ''));
const isMandatePayment = (p) => !!(p && p.metadata && p.metadata.via === VIA);

async function finish(payment, mandate) {
  await activateFromPayment(payment);
  if (mandate && mandate.next_charge_at) { // run to the next EcoPay charge date + grace, not a fixed 30 days
    const end = new Date(new Date(mandate.next_charge_at).getTime() + GRACE_DAYS * 864e5);
    const t = await Tenant.findByPk(payment.tenantId);
    // first payment keeps any longer remaining paid time; renewals follow the EcoPay schedule exactly (no drift)
    const renewal = Number((payment.metadata && payment.metadata.period) || 0) > 0;
    if (t && t.subscriptionPaymentId === payment.id && (renewal || !t.subscriptionEndsAt || new Date(t.subscriptionEndsAt) < end)) { t.subscriptionEndsAt = end; await t.save(); }
  }
  try { require('./access').invalidate(payment.tenantId); } catch (_) { /* cache optional */ }
  try {
    const docs = await createForSubscriptionPayment(payment);
    if (docs) { try { await sendSubscriptionPaymentNotification(payment, docs.invoice, docs.receipt, docs.tenant); } catch (e) { logger.error('renewal notification failed', { paymentId: payment.id, message: e.message }); } }
  } catch (e) { logger.error('renewal billing documents failed', { paymentId: payment.id, message: e.message }); }
}

/** Start automatic payment for the tenant's selected plan. Returns { payment, approveUrl?, message }. */
async function start({ tenant, rail, phone, base, req, stamp, userId }) {
  const plan = tenant.subscriptionPlan;
  const territory = String(tenant.territory || 'KE').toUpperCase();
  const m = await rec.methods(territory);
  if (!m.default_methods.includes(rail)) throw ApiError.badRequest(`${rail === 'mpesa' ? 'M-Pesa' : 'PayPal'} is not available in ${territory}`);
  const amount = rail === 'mpesa' ? PLANS[plan].kes : PLANS[plan].usd;
  const paymentId = crypto.randomUUID();
  const r = await rec.createMandate({
    rail, territory, interval: 'monthly', tier: plan, subject_ref: `worker:${tenant.id}:${plan}`, description: `Worker ${plan}`,
    ...(rail === 'mpesa' ? { amount: String(amount), currency: 'KES', phone } : { amount: Number(amount).toFixed(2), currency: 'USD', return_url: `${base}/payments/paypal/return?token=${paymentId}` }),
  });
  const ref = `${r.mandate.id}:0`;
  let payment = await Payment.findOne({ where: { providerRef: ref } });
  if (!payment) {
    payment = await Payment.create({
      id: paymentId, provider: rail, purpose: `Worker ${plan} subscription`, amount, currency: rail === 'mpesa' ? 'KES' : 'USD',
      status: 'pending', providerRef: ref, payerRef: rail === 'mpesa' ? phone : null,
      metadata: { type: 'subscription', plan, via: VIA, mandateId: r.mandate.id, period: 0, mode: r.mandate.mode },
      initiatedById: userId || null, ...stamp(req, {}),
    });
  }
  return { payment, approveUrl: r.approve_url || null, message: r.message };
}

/** Confirm one pending mandate payment from EcoPay; completes it exactly once. */
async function syncPayment(payment) {
  if (!isMandatePayment(payment) || payment.status !== 'pending') return payment;
  const { mandate, charges } = await rec.getMandate(payment.metadata.mandateId);
  const ch = (charges || []).find((c) => c.period === Number(payment.metadata.period || 0));
  if (ch && ch.status === 'succeeded') {
    const [n] = await Payment.update({ status: 'completed', providerReceipt: ch.provider_ref || null }, { where: { id: payment.id, status: 'pending' } });
    await payment.reload();
    if (n === 1) { await finish(payment, mandate); await cancelOthers(payment); }
  } else if (['failed', 'cancelled'].includes(mandate.status) || (ch && ch.status === 'failed')) {
    await Payment.update({ status: 'failed' }, { where: { id: payment.id, status: 'pending' } });
    await payment.reload();
  }
  return payment;
}

// A newly paid plan replaces the previous one: stop the previous mandate so nobody is charged twice.
async function cancelOthers(payment) {
  const mid = payment.metadata.mandateId;
  const others = await Payment.findAll({ where: { tenantId: payment.tenantId, status: 'completed', id: { [Op.ne]: payment.id } }, order: [['createdAt', 'DESC']], limit: 50 });
  const seen = new Set();
  for (const p of others) {
    const om = isMandatePayment(p) && p.metadata.mandateId;
    if (!om || om === mid || seen.has(om)) continue; seen.add(om);
    await rec.cancelMandate(om).catch((e) => logger.error('previous mandate cancel failed', { mandate: om, message: e.message }));
  }
}

/** Renewal worker pass. */
async function reconcile() {
  const out = { confirmed: 0, renewed: 0, errors: 0 };
  const pending = await Payment.findAll({ where: { status: 'pending', createdAt: { [Op.gte]: new Date(Date.now() - 3 * 864e5) } }, limit: 200 });
  for (const p of pending.filter(isMandatePayment)) {
    try { await syncPayment(p); if (p.status === 'completed') out.confirmed++; } catch (e) { out.errors++; logger.error('renewal sync pending', { paymentId: p.id, message: e.message }); }
  }
  const tenants = await Tenant.findAll({ where: { subscriptionPaymentId: { [Op.ne]: null }, subscriptionStatus: 'active' }, limit: 5000 });
  for (const t of tenants) {
    try {
      const cur = await Payment.findByPk(t.subscriptionPaymentId);
      if (!isMandatePayment(cur)) continue;
      const mid = cur.metadata.mandateId;
      const { mandate, charges } = await rec.getMandate(mid);
      for (const ch of (charges || []).filter((c) => c.status === 'succeeded' && c.period > 0).sort((a, b) => a.period - b.period)) {
        const ref = `${mid}:${ch.period}`;
        if (await Payment.findOne({ where: { providerRef: ref } })) continue;
        const p = await Payment.create({ tenantId: t.id, provider: cur.provider, purpose: cur.purpose, amount: cur.amount, currency: cur.currency,
          status: 'completed', providerRef: ref, providerReceipt: ch.provider_ref || null, payerRef: cur.payerRef,
          metadata: { ...cur.metadata, period: ch.period, renewal: true }, initiatedById: null });
        await finish(p, mandate); out.renewed++;
      }
      if (mandate.status === 'past_due') logger.warn('Worker renewal failed (past_due); access runs to the paid period end + grace', { tenantId: t.id, mandate: mid });
    } catch (e) { out.errors++; logger.error('renewal sync tenant', { tenantId: t.id, message: e.message }); }
  }
  return out;
}

/** Stop automatic renewal for a tenant (e.g. when it cancels). */
async function cancelRenewal(tenantId) {
  const t = await Tenant.findByPk(tenantId);
  const cur = t && t.subscriptionPaymentId && await Payment.findByPk(t.subscriptionPaymentId);
  if (!isMandatePayment(cur)) return null;
  return rec.cancelMandate(cur.metadata.mandateId).catch((e) => { logger.error('mandate cancel failed', { message: e.message }); return null; });
}

module.exports = { start, syncPayment, reconcile, cancelRenewal, isMandatePayment, isMid, VIA };
