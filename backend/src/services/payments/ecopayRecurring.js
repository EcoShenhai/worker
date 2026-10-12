'use strict';
// EcoPay automatic renewals client (EcoPay holds every rail credential).
//   ECOPAY_INTERNAL_URL  default http://127.0.0.1:4006 (same host)
//   ECOPAY_BILLING_KEY   API key with scope ecopay:billing (issued by EcoPay)
const fs = require('fs');
const path = require('path');
// Key from the environment, else straight from backend/.env (written there by EcoPay's issue_app_key.js).
let fileKey;
function keyOf() {
  if (process.env.ECOPAY_BILLING_KEY) return process.env.ECOPAY_BILLING_KEY;
  if (fileKey === undefined) {
    try { const m = /^ECOPAY_BILLING_KEY=(.+)$/m.exec(fs.readFileSync(path.join(__dirname, '../../../.env'), 'utf8')); fileKey = m ? m[1].trim() : null; } catch { fileKey = null; }
  }
  return fileKey;
}
const BASE = () => String(process.env.ECOPAY_INTERNAL_URL || 'http://127.0.0.1:4006').replace(/\/+$/, '');

async function call(method, path, body) {
  const key = keyOf();
  if (!key) { const e = new Error('ECOPAY_BILLING_KEY is not configured'); e.status = 503; throw e; }
  const res = await fetch(`${BASE()}/api/v1${path}`, {
    method, signal: AbortSignal.timeout(30000),
    headers: { 'content-type': 'application/json', 'x-api-key': key },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text(); let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  if (!res.ok) { const e = new Error(json.error || `EcoPay ${res.status}`); e.status = res.status; e.code = json.code; throw e; }
  return json;
}

module.exports = {
  configured: () => !!keyOf(),
  methods: (territory) => call('GET', `/checkout/methods/${encodeURIComponent(territory || 'KE')}`),
  createMandate: (b) => call('POST', '/recurring/mandates', b),
  getMandate: (id) => call('GET', `/recurring/mandates/${encodeURIComponent(id)}`),
  cancelMandate: (id) => call('POST', `/recurring/mandates/${encodeURIComponent(id)}/cancel`, {}),
  listMandates: (subjectRef) => call('GET', `/recurring/mandates?subject_ref=${encodeURIComponent(subjectRef)}`),
  retryMandate: (id) => call('POST', `/recurring/mandates/${encodeURIComponent(id)}/retry`, {}),
};
