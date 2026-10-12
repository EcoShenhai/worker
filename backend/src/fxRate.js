'use strict';
/**
 * Shared exchange rate (2026-10-12). One rate for every Shenhai B2X app:
 *   1 /srv/apps/_shared/fx/rates.json, refreshed daily from open.er-api.com (used while under 4 days old);
 *   2 otherwise the certified Localization JSONB estimate (exchange.rate in the master copy);
 *   3 otherwise ECOPAY_KES_PER_USD / 130 for KES.
 * Prices are one USD price worldwide; this only converts USD to M-Pesa KES and to local estimates.
 */
const fs = require('fs'); const path = require('path');
const FILE = process.env.FX_RATES_FILE || '/srv/apps/_shared/fx/rates.json';
const JSONB = process.env.LOCALIZATION_DIR || '/srv/apps/_shared/localization/territories';
const MAX_AGE_MS = 4 * 864e5;
let cache = { checked: 0, mtime: 0, data: null }; let ref = null;

function daily() {
  const now = Date.now();
  if (now - cache.checked > 60000) {
    cache.checked = now;
    try { const st = fs.statSync(FILE); if (st.mtimeMs !== cache.mtime) { cache.data = JSON.parse(fs.readFileSync(FILE, 'utf8')); cache.mtime = st.mtimeMs; } }
    catch { cache.data = null; cache.mtime = 0; }
  }
  const d = cache.data;
  return d && d.rates && d.fetched_at && now - Date.parse(d.fetched_at) < MAX_AGE_MS ? d : null;
}
function reference() {
  if (ref) return ref;
  ref = { byCcy: {}, byTerritory: {} };
  try { for (const f of fs.readdirSync(JSONB)) { if (!f.endsWith('.json')) continue;
    try { const j = JSON.parse(fs.readFileSync(path.join(JSONB, f), 'utf8')); const t = f.replace(/\.json$/, ''); const c = j.currency && j.currency.code;
      if (c) ref.byTerritory[t] = c;
      const r = j.exchange && Number(j.exchange.rate); if (c && r > 0 && (!j.exchange.base || j.exchange.base === 'USD')) ref.byCcy[c] = r; } catch { /* skip */ } } } catch { /* no JSONB */ }
  return ref;
}
/** { rate, as_of, source } for 1 USD in `ccy`, or null when unknown. */
function rateFor(ccy) {
  const c = String(ccy || '').toUpperCase();
  if (!c) return null;
  if (c === 'USD') return { rate: 1, as_of: null, source: 'base' };
  const d = daily();
  if (d && Number(d.rates[c]) > 0) return { rate: Number(d.rates[c]), as_of: d.as_of, source: 'daily' };
  const r = reference().byCcy[c];
  if (r) return { rate: r, as_of: null, source: 'jsonb_estimate' };
  return null;
}
function kesPerUsd() {
  const r = rateFor('KES');
  return r && r.rate > 0 ? r.rate : Number(process.env.ECOPAY_KES_PER_USD || 130);
}
function currencyOf(territory) { return reference().byTerritory[String(territory || '').toUpperCase()] || null; }
/** What a pricing page needs to show next to a USD price for a territory. */
function localInfo(territory) {
  const t = String(territory || '').toUpperCase(); const currency = currencyOf(t) || 'USD';
  const r = rateFor(currency);
  return { territory: t || null, currency, rate: r ? r.rate : null, as_of: r ? r.as_of : null, source: r ? r.source : null,
    charged: t === 'KE' ? 'KES by M-Pesa at this rate, or USD by PayPal' : 'USD', estimate: t !== 'KE' && currency !== 'USD' };
}
module.exports = { rateFor, kesPerUsd, currencyOf, localInfo, _reset: () => { cache = { checked: 0, mtime: 0, data: null }; ref = null; } };
