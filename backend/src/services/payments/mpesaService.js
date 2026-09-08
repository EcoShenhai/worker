'use strict';
const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');
const ApiError = require('../../utils/apiError');

/**
 * Safaricom M-Pesa (Daraja) — STK Push. Sandbox and production supported via
 * MPESA_ENV. Credentials come only from environment variables.
 */
const cfg = config.payments.mpesa;

function baseUrl() {
  return cfg.env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

function ensureEnabled() {
  if (!cfg.enabled) throw ApiError.badRequest('M-Pesa is disabled (set MPESA_ENABLED=true).');
  if (!cfg.consumerKey || !cfg.consumerSecret) throw ApiError.internal('M-Pesa credentials missing.');
}

async function getAccessToken() {
  ensureEnabled();
  const auth = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
  try {
    const { data } = await axios.get(
      `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` }, timeout: 30000 }
    );
    return data.access_token;
  } catch (e) {
    logger.error('M-Pesa token error', { message: e.message });
    throw ApiError.internal('Failed to obtain M-Pesa access token.');
  }
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizePhone(phone) {
  let p = String(phone).replace(/\D/g, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
  return p;
}

async function stkPush({ phone, amount, accountRef = 'Worker', description = 'Payment' }) {
  ensureEnabled();
  const token = await getAccessToken();
  const ts = timestamp();
  const password = Buffer.from(`${cfg.shortcode}${cfg.passkey}${ts}`).toString('base64');

  const payload = {
    BusinessShortCode: cfg.shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: cfg.transactionType,
    Amount: Math.round(Number(amount)),
    PartyA: normalizePhone(phone),
    PartyB: cfg.shortcode,
    PhoneNumber: normalizePhone(phone),
    CallBackURL: cfg.callbackUrl,
    AccountReference: accountRef.slice(0, 12),
    TransactionDesc: description.slice(0, 20),
  };

  try {
    const { data } = await axios.post(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });
    return data; // includes CheckoutRequestID, ResponseCode, etc.
  } catch (e) {
    logger.error('M-Pesa STK push failed', { message: e.message, data: e.response && e.response.data });
    throw ApiError.internal('M-Pesa STK push failed.');
  }
}

// Parse a Daraja STK callback into a normalized result.
function parseCallback(body) {
  const cb = body && body.Body && body.Body.stkCallback;
  if (!cb) return { ok: false, reason: 'malformed_callback', raw: body };
  const result = {
    ok: cb.ResultCode === 0,
    resultCode: cb.ResultCode,
    resultDesc: cb.ResultDesc,
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: cb.MerchantRequestID,
    receipt: null,
    amount: null,
    phone: null,
  };
  const items = cb.CallbackMetadata && cb.CallbackMetadata.Item;
  if (Array.isArray(items)) {
    for (const it of items) {
      if (it.Name === 'MpesaReceiptNumber') result.receipt = it.Value;
      if (it.Name === 'Amount') result.amount = it.Value;
      if (it.Name === 'PhoneNumber') result.phone = it.Value;
    }
  }
  return result;
}

module.exports = { stkPush, parseCallback, getAccessToken };
