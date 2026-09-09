'use strict';
const { Payment } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const mpesa = require('../services/payments/mpesaService');
const paypal = require('../services/payments/paypalService');
const config = require('../config');
const audit = require('../services/audit/auditService');
const { scopeWhere, stamp } = require('../utils/tenancy');
const logger = require('../utils/logger');

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
const mpesaCallback = asyncHandler(async (req, res) => {
  const parsed = mpesa.parseCallback(req.body);
  if (parsed.checkoutRequestId) {
    const payment = await Payment.findOne({ where: { providerRef: parsed.checkoutRequestId } });
    if (payment) {
      payment.status = parsed.ok ? 'completed' : 'failed';
      payment.providerReceipt = parsed.receipt || null;
      payment.rawCallback = req.body;
      await payment.save();
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

const paypalCapture = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) throw ApiError.badRequest('orderId is required');
  const result = await paypal.captureOrder(orderId);
  const payment = await Payment.findOne({ where: { providerRef: orderId } });
  if (payment) {
    payment.status = result.ok ? 'completed' : 'failed';
    payment.providerReceipt = result.captureId || null;
    payment.payerRef = result.payerEmail || null;
    payment.rawCallback = result.raw;
    await payment.save();
  }
  await audit.record(req, 'payment.paypal.capture', { resourceType: 'payment', resourceId: payment ? payment.id : null });
  res.json({ ok: result.ok, payment });
});

const list = asyncHandler(async (req, res) => {
  const payments = await Payment.findAll({ where: scopeWhere(req), order: [['createdAt', 'DESC']], limit: 200 });
  res.json({ payments });
});

module.exports = { mpesaInitiate, mpesaCallback, paypalCreate, paypalCapture, list };
