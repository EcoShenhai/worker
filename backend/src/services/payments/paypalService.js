'use strict';
const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');
const ApiError = require('../../utils/apiError');

/**
 * PayPal Orders v2 (create + capture). Credentials from environment only.
 */
const cfg = config.payments.paypal;

function baseUrl() {
  return cfg.env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

function ensureEnabled() {
  if (!cfg.enabled) throw ApiError.badRequest('PayPal is disabled (set PAYPAL_ENABLED=true).');
  if (!cfg.clientId || !cfg.clientSecret) throw ApiError.internal('PayPal credentials missing.');
}

async function getAccessToken() {
  ensureEnabled();
  const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  try {
    const { data } = await axios.post(`${baseUrl()}/v1/oauth2/token`, 'grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });
    return data.access_token;
  } catch (e) {
    logger.error('PayPal token error', { message: e.message });
    throw ApiError.internal('Failed to obtain PayPal access token.');
  }
}

async function createOrder({ amount, currency, description = 'Worker payment', returnUrl, cancelUrl }) {
  const token = await getAccessToken();
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: { currency_code: currency || cfg.currency, value: Number(amount).toFixed(2) },
        description: description.slice(0, 127),
      },
    ],
    application_context: {
      return_url: returnUrl,
      cancel_url: cancelUrl,
      user_action: 'PAY_NOW',
    },
  };
  try {
    const { data } = await axios.post(`${baseUrl()}/v2/checkout/orders`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    const approve = (data.links || []).find((l) => l.rel === 'approve');
    return { id: data.id, status: data.status, approveUrl: approve ? approve.href : null, raw: data };
  } catch (e) {
    logger.error('PayPal create order failed', { message: e.message, data: e.response && e.response.data });
    throw ApiError.internal('PayPal order creation failed.');
  }
}

async function captureOrder(orderId) {
  const token = await getAccessToken();
  try {
    const { data } = await axios.post(`${baseUrl()}/v2/checkout/orders/${orderId}/capture`, {}, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    const cap = data.purchase_units &&
      data.purchase_units[0] &&
      data.purchase_units[0].payments &&
      data.purchase_units[0].payments.captures &&
      data.purchase_units[0].payments.captures[0];
    return {
      ok: data.status === 'COMPLETED',
      status: data.status,
      captureId: cap ? cap.id : null,
      payerEmail: data.payer ? data.payer.email_address : null,
      raw: data,
    };
  } catch (e) {
    logger.error('PayPal capture failed', { message: e.message, data: e.response && e.response.data });
    throw ApiError.internal('PayPal capture failed.');
  }
}

module.exports = { createOrder, captureOrder, getAccessToken };
