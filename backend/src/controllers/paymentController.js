'use strict';
const { Payment, Tenant } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const mpesa = require('../services/payments/mpesaService');
const paypal = require('../services/payments/paypalService');
const ecopayPay = require('../services/payments/ecopayPay.service');
// Subscription rails via EcoPay. Extend (e.g. "mpesa,paypal,stripe") as production credentials land.
const ALLOWED_RAILS = String(process.env.ECOPAY_ALLOWED_RAILS || 'mpesa,paypal').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
const railAllowed = (r) => ALLOWED_RAILS.includes(r);
const normalizeKePhone = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '254' + d.slice(1); return /^254(7|1)\d{8}$/.test(d) ? d : null; };

// Activate the plan, then issue invoice + receipt and notify (same steps as the provider callbacks).
async function finishSubscriptionPayment(payment) {
  await activateFromPayment(payment);
  try {
    const documents = await createForSubscriptionPayment(payment);
    if (documents) {
      try { await sendSubscriptionPaymentNotification(payment, documents.invoice, documents.receipt, documents.tenant); }
      catch (e) { logger.error('EcoPay subscription notification failed', { paymentId: payment.id, message: e.message }); }
    }
  } catch (e) { logger.error('EcoPay billing document creation failed', { paymentId: payment.id, message: e.message }); }
}

// Ask EcoPay about a pending payment; complete it exactly once.
async function confirmEcoPayPayment(payment) {
  if (payment.status !== 'pending') return payment;
  const tx = await ecopayPay.status(payment.metadata.ecopayTxId || payment.providerRef);
  const st = String(tx.status || '').toUpperCase();
  if (st === 'FAILED') {
    await Payment.update({ status: 'failed', rawCallback: tx }, { where: { id: payment.id, status: 'pending' } });
  } else if (st === 'COMPLETED') {
    const [n] = await Payment.update({ status: 'completed', providerReceipt: tx.payout_ref || tx.id, rawCallback: tx }, { where: { id: payment.id, status: 'pending' } });
    await payment.reload();
    if (n === 1) await finishSubscriptionPayment(payment);
    return payment;
  }
  await payment.reload();
  return payment;
}
const config = require('../config');
const audit = require('../services/audit/auditService');
const { scopeWhere, stamp } = require('../utils/tenancy');
const logger = require('../utils/logger');
const { PLANS, activateFromPayment } = require('../services/payments/subscriptionService');
const { createForSubscriptionPayment } = require('../services/payments/billingDocumentService');
const { sendSubscriptionPaymentNotification } = require('../services/payments/subscriptionNotificationService');

// --- M-Pesa ---------------------------------------------------------------
const mpesaInitiate = asyncHandler(async (req, res) => {
  const { phone, amount, purpose } = req.body;
  if (!phone || !amount) throw ApiError.badRequest('phone and amount are required');
  const resp = await mpesa.stkPush({ phone, amount, accountRef: 'Worker', description: purpose || 'Worker payment' });
  const payment = await Payment.create({
    provider: 'mpesa',
    purpose: purpose || null,
    amount,
    currency: 'KES',
    status: 'pending',
    providerRef: resp.CheckoutRequestID || null,
    payerRef: phone,
    metadata: { merchantRequestId: resp.MerchantRequestID || null },
    initiatedById: req.user ? req.user.id : null,
    ...stamp(req, {}),
  });
  await audit.record(req, 'payment.mpesa.initiate', { resourceType: 'payment', resourceId: payment.id });
  res.status(201).json({ payment, providerResponse: resp });
});

// Public callback (no auth) — configure MPESA_CALLBACK_URL to this route.
const subscriptionMpesaInitiate = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw ApiError.badRequest('phone is required');

  const tenant = req.user?.tenantId ? await Tenant.findByPk(req.user.tenantId) : null;
  if (!tenant) throw ApiError.badRequest('No organisation associated with this account');

  const plan = tenant.subscriptionPlan;
  if (!PLANS[plan]) throw ApiError.badRequest('Select a subscription plan first');

  if (!railAllowed('mpesa')) throw ApiError.badRequest('M-Pesa is not enabled');
  const kePhone = normalizeKePhone(phone);
  if (!kePhone) throw ApiError.badRequest('phone must be a Kenyan M-Pesa number (2547XXXXXXXX)');
  const amount = PLANS[plan].kes;
  const eco = await ecopayPay.payMpesa({ amount: String(amount), phone: kePhone, reference: 'Worker', description: `Worker ${plan}`.slice(0, 13) });
  const resp = { CheckoutRequestID: eco.transaction_id, CustomerMessage: eco.customerMessage || 'Check your phone to authorize the payment.', via: 'ecopay' };

  const payment = await Payment.create({
    provider: 'mpesa',
    purpose: `Worker ${plan} subscription`,
    amount,
    currency: 'KES',
    status: 'pending',
    providerRef: resp.CheckoutRequestID || null,
    payerRef: phone,
    metadata: {
      type: 'subscription',
      plan,
      via: 'ecopay', ecopayTxId: eco.transaction_id,
    },
    initiatedById: req.user.id,
    ...stamp(req, {}),
  });

  await audit.record(req, 'payment.subscription.mpesa.initiate', {
    resourceType: 'payment',
    resourceId: payment.id,
    metadata: { plan, amount },
  });

  res.status(201).json({ payment, providerResponse: resp });
});

const mpesaCallback = asyncHandler(async (req, res) => {
  const parsed = mpesa.parseCallback(req.body);
  if (parsed.checkoutRequestId) {
    const payment = await Payment.findOne({ where: { providerRef: parsed.checkoutRequestId } });
    if (payment) {
      payment.status = parsed.ok ? 'completed' : 'failed';
      payment.providerReceipt = parsed.receipt || null;
      payment.rawCallback = req.body;
      await payment.save();

      if (parsed.ok) {
        await activateFromPayment(payment);

        try {
          const documents = await createForSubscriptionPayment(payment);

          if (documents) {
            try {
              await sendSubscriptionPaymentNotification(
                payment,
                documents.invoice,
                documents.receipt,
                documents.tenant
              );
            } catch (notificationError) {
              logger.error('M-Pesa subscription notification failed', {
                paymentId: payment.id,
                message: notificationError.message,
              });
            }
          }
        } catch (billingError) {
          logger.error('M-Pesa billing document creation failed', {
            paymentId: payment.id,
            message: billingError.message,
          });
        }
      }
    }
  }
  // Always acknowledge to Safaricom.
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// --- PayPal ---------------------------------------------------------------
const paypalCreate = asyncHandler(async (req, res) => {
  const { amount, currency, purpose } = req.body;
  if (!amount) throw ApiError.badRequest('amount is required');
  const base = config.frontendUrl.replace(/\/$/, '');
  const order = await paypal.createOrder({
    amount,
    currency: currency || config.payments.paypal.currency,
    description: purpose || 'Worker payment',
    returnUrl: `${base}/payments/paypal/return`,
    cancelUrl: `${base}/payments/paypal/cancel`,
  });
  const payment = await Payment.create({
    provider: 'paypal',
    purpose: purpose || null,
    amount,
    currency: currency || config.payments.paypal.currency,
    status: 'pending',
    providerRef: order.id,
    initiatedById: req.user ? req.user.id : null,
    ...stamp(req, {}),
  });
  await audit.record(req, 'payment.paypal.create', { resourceType: 'payment', resourceId: payment.id });
  res.status(201).json({ payment, approveUrl: order.approveUrl });
});

const subscriptionPaypalCreate = asyncHandler(async (req, res) => {
  const tenant = req.user?.tenantId ? await Tenant.findByPk(req.user.tenantId) : null;
  if (!tenant) throw ApiError.badRequest('No organisation associated with this account');

  const plan = tenant.subscriptionPlan;
  if (!PLANS[plan]) throw ApiError.badRequest('Select a subscription plan first');

  if (!railAllowed('paypal')) throw ApiError.badRequest('PayPal is not enabled');
  const amount = PLANS[plan].usd;
  const base = config.frontendUrl.replace(/\/$/, '');
  const eco = await ecopayPay.payPaypal({ amount: String(amount), currency: 'USD', reference: 'Worker',
    description: `Worker ${plan} subscription`, returnUrl: `${base}/payments/paypal/return` });
  const order = { id: eco.orderId || eco.transaction_id, approveUrl: eco.approveUrl };

  const payment = await Payment.create({
    provider: 'paypal',
    purpose: `Worker ${plan} subscription`,
    amount,
    currency: 'USD',
    status: 'pending',
    providerRef: order.id,
    metadata: {
      type: 'subscription',
      plan,
      via: 'ecopay', ecopayTxId: eco.transaction_id,
    },
    initiatedById: req.user.id,
    ...stamp(req, {}),
  });

  await audit.record(req, 'payment.subscription.paypal.create', {
    resourceType: 'payment',
    resourceId: payment.id,
    metadata: { plan, amount },
  });

  res.status(201).json({ payment, approveUrl: order.approveUrl });
});

const paypalCapture = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) throw ApiError.badRequest('orderId is required');
  // EcoPay-settled orders (captured by EcoPay on return): confirm within the caller's organisation only.
  const ecoPayment = await Payment.findOne({ where: { ...scopeWhere(req), providerRef: orderId } });
  if (ecoPayment && ecoPayment.metadata && ecoPayment.metadata.via === 'ecopay') {
    const done = await confirmEcoPayPayment(ecoPayment);
    await audit.record(req, 'payment.paypal.capture', { resourceType: 'payment', resourceId: done.id });
    return res.json({ ok: done.status === 'completed', payment: done });
  }
  // Legacy direct-PayPal orders.
  const result = await paypal.captureOrder(orderId);
  const payment = await Payment.findOne({ where: { providerRef: orderId } });
  if (payment) {
    payment.status = result.ok ? 'completed' : 'failed';
    payment.providerReceipt = result.captureId || null;
    payment.payerRef = result.payerEmail || null;
    payment.rawCallback = result.raw;
    await payment.save();

    if (result.ok) {
      await activateFromPayment(payment);

      try {
        const documents = await createForSubscriptionPayment(payment);

        if (documents) {
          try {
            await sendSubscriptionPaymentNotification(
              payment,
              documents.invoice,
              documents.receipt,
              documents.tenant
            );
          } catch (notificationError) {
            logger.error('PayPal subscription notification failed', {
              paymentId: payment.id,
              message: notificationError.message,
            });
          }
        }
      } catch (billingError) {
        logger.error('PayPal billing document creation failed', {
          paymentId: payment.id,
          message: billingError.message,
        });
      }
    }
  }
  await audit.record(req, 'payment.paypal.capture', { resourceType: 'payment', resourceId: payment ? payment.id : null });
  res.json({ ok: result.ok, payment });
});

// GET /payments/:id/status — organisation-scoped; confirms an EcoPay payment (replaces waiting for Safaricom's callback).
const paymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ where: { ...scopeWhere(req), id: req.params.id } });
  if (!payment) return res.status(404).json({ error: 'payment not found' });
  if (payment.metadata && payment.metadata.via === 'ecopay') {
    try { await confirmEcoPayPayment(payment); } catch (e) { logger.error('EcoPay status check failed', { paymentId: payment.id, message: e.message }); }
  }
  res.json({ payment: { id: payment.id, status: payment.status, purpose: payment.purpose, amount: payment.amount, currency: payment.currency } });
});

const list = asyncHandler(async (req, res) => {
  const payments = await Payment.findAll({ where: scopeWhere(req), order: [['createdAt', 'DESC']], limit: 200 });
  res.json({ payments });
});

module.exports = { mpesaInitiate, subscriptionMpesaInitiate, mpesaCallback, paypalCreate, subscriptionPaypalCreate, paypalCapture, paymentStatus, list };
