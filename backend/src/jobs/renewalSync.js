'use strict';
// Worker plans renewed by EcoPay (pm2: worker-renewals).
//   node src/jobs/renewalSync.js [--once]
try { require('../config'); } catch (e) { console.error('[renewals] config load warning:', e.message); }
const { reconcile } = require('../services/payments/subscriptionRenewals');
const EVERY = Number(process.env.RENEWAL_SYNC_MS || 5 * 60e3);
async function pass() {
  try { const r = await reconcile(); if (r.confirmed || r.renewed || r.errors || process.argv.includes('--once')) console.log('[renewals]', JSON.stringify(r)); return r; }
  catch (e) { console.error('[renewals] pass failed:', e.message); return { error: e.message }; }
}
if (process.argv.includes('--once')) pass().then((r) => { console.log(JSON.stringify(r)); process.exit(r.error ? 1 : 0); });
else { pass(); setInterval(pass, EVERY); console.log(`[renewals] started (every ${EVERY} ms)`); }
