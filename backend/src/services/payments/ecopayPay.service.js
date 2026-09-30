"use strict";
// Worker -> EcoPay public pay API (/pay/mpesa, /pay/paypal, /status). EcoPay holds every rail credential.
const BASE = (process.env.ECOPAY_PAY_ENDPOINT || "https://payb2x.com").replace(/\/+$/, "");
async function call(method, path, body) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method, signal: AbortSignal.timeout(20000),
    headers: { "content-type": "application/json", "x-worker": "1" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text(); let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  if (!res.ok) { const e = new Error(json.error || `EcoPay ${res.status}`); e.status = res.status; e.detail = json.detail; throw e; }
  return json;
}
module.exports = {
  payMpesa: ({ amount, phone, reference, description }) => call("POST", "/pay/mpesa", { amount, phone, reference, description }),
  payPaypal: ({ amount, currency, reference, description, returnUrl }) => call("POST", "/pay/paypal", { amount, currency, reference, description, returnUrl }),
  status: (id) => call("GET", `/status/${encodeURIComponent(id)}`),
};
