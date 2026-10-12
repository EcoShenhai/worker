/* LocalPrice (Shenhai B2X, 2026-10-12)
   Shows, under a USD price, today's approximate amount in the visitor's own currency, so someone in Fiji,
   Norway or Brazil can see FJD / NOK / BRL. Prices stay one USD price worldwide: this is an estimate only.
   Kenya shows the KES amount M-Pesa charges (USD x today's rate, rounded up).
   Currency: the visitor's own choice (picker), else the territory passed by the page, else the device's
   time zone, else the browser language region. Rates: /fx/rates.json (daily, same site), else the snapshot
   bundled at build time (fxSnapshot.json). */
import { useEffect, useSyncExternalStore } from 'react';
import SNAP from './fxSnapshot.json';

const KEY = 'shenhai_local_currency';
const MAX_AGE = 4 * 864e5;
const readChoice = () => { try { return localStorage.getItem(KEY) || null; } catch { return null; } };
const store = { rates: SNAP.rates || {}, asOf: SNAP.as_of || null, choice: readChoice(), v: 0 };
const subs = new Set();
const emit = () => { store.v += 1; subs.forEach((f) => f()); };
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
const version = () => store.v;
let fetched = false;
function loadLive() {
  if (fetched || typeof fetch !== 'function') return; fetched = true;
  fetch('/fx/rates.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d && d.rates && d.fetched_at && Date.now() - Date.parse(d.fetched_at) < MAX_AGE) { store.rates = d.rates; store.asOf = d.as_of; emit(); } })
    .catch(() => { /* keep the bundled snapshot */ });
}
function deviceCountry() {
  try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; const c = SNAP.tz && SNAP.tz[tz]; if (c) return c; } catch { /* no Intl */ }
  try {
    const tags = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const t of tags) { const m = String(t).match(/-([A-Za-z]{2})\b/); if (m) return m[1].toUpperCase(); }
  } catch { /* no navigator */ }
  return 'US';
}
const currencyOf = (country) => (SNAP.currency_of && SNAP.currency_of[String(country || '').toUpperCase()]) || 'USD';
function pickCurrency(territory, explicit) {
  if (explicit && territory) return currencyOf(territory);
  if (store.choice && store.rates[store.choice]) return store.choice;
  return currencyOf(territory || deviceCountry());
}
const fmt = (n, d) => { try { return new Intl.NumberFormat(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }).format(n); } catch { return n.toFixed(d); } };

/** <LocalPrice usd={10} /> -> "≈ NOK 108 · charged in USD", or in Kenya "or KES 1,298 by M-Pesa". */
export default function LocalPrice({ usd, territory, explicit = false, inline = false, className, style }) {
  useSyncExternalStore(subscribe, version, version);
  useEffect(loadLive, []);
  const amount = Number(usd);
  if (!(amount > 0)) return null;
  const ccy = pickCurrency(territory, explicit);
  const rate = Number(store.rates[ccy]);
  if (ccy === 'USD' || !(rate > 0)) return null;
  const local = amount * rate;
  const text = ccy === 'KES'
    ? `or KES ${fmt(Math.ceil(local), 0)} by M-Pesa`
    : `≈ ${ccy} ${fmt(local, local >= 100 ? 0 : 2)} · charged in USD`;
  const title = `${ccy === 'KES' ? 'M-Pesa amount' : 'Estimate'} at the exchange rate of ${store.asOf || 'today'}${ccy === 'KES' ? '' : '. You pay in US dollars; your bank may use a slightly different rate'}.`;
  if (inline) return <span className={className} title={title} style={{ opacity: 0.8, ...style }}>{` · ${text}`}</span>;
  return <div className={className} title={title} data-local-price style={{ fontSize: '.82rem', opacity: 0.8, margin: '.15rem 0 .35rem', ...style }}>{text}</div>;
}

/** Lets the visitor choose the currency for the estimates (remembered on this device). */
export function LocalCurrencyPicker({ inline = false, className, style }) {
  useSyncExternalStore(subscribe, version, version);
  useEffect(loadLive, []);
  const auto = currencyOf(deviceCountry());
  let names = null; try { names = new Intl.DisplayNames([navigator.language || 'en'], { type: 'currency' }); } catch { /* no names */ }
  const label = (c) => { try { const n = names && names.of(c); return n && n !== c ? `${c} · ${n}` : c; } catch { return c; } };
  const codes = Object.keys(store.rates).filter((c) => c !== 'USD' && store.rates[c] > 0).sort();
  const set = (v) => { store.choice = v || null; try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* not remembered */ } emit(); };
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag className={className} style={{ fontSize: '.82rem', whiteSpace: 'nowrap', ...style }}>
      <label>
        <span style={{ opacity: 0.8 }}>Show estimates in </span>
        <select value={store.choice || ''} onChange={(e) => set(e.target.value)} aria-label="Currency for price estimates"
          style={{ font: 'inherit', fontSize: '.82rem', padding: '1px 4px', maxWidth: 220 }}>
          <option value="">{auto === 'USD' ? 'US dollars only' : `${auto} (your region)`}</option>
          {codes.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
      </label>
    </Tag>
  );
}
