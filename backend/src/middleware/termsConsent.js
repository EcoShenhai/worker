'use strict';
// Records acceptance of the Terms and Privacy policy (version + timestamp) on successful signup.
// GDPR accountability (Art. 5(2), 7(1)). Never blocks or alters the signup response.
const TERMS_VERSION = process.env.TERMS_VERSION || '2026-09-30';
const PATH_RE = /\/(register|signup)$/i;
let table = null, ready = null;
function db() { const m = require('../config/database'); return m.sequelize || m.default || m; }
function init() {
  if (!ready) ready = (async () => {
    const sq = db();
    const [rows] = await sq.query("SELECT table_name FROM information_schema.columns WHERE table_schema = current_schema() AND column_name = 'email' AND table_name ILIKE '%user%' ORDER BY (table_name = 'users') DESC, (table_name = 'Users') DESC, length(table_name) LIMIT 1");
    if (!rows.length) throw new Error('no users table with an email column');
    table = rows[0].table_name;
    await sq.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS terms_version VARCHAR(32), ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ`);
    console.log(`[terms-consent] recording acceptance on "${table}" (version ${TERMS_VERSION})`);
  })().catch((e) => { console.error('[terms-consent] init failed:', e.message); ready = null; });
  return ready;
}
const t = setTimeout(init, 5000); if (t.unref) t.unref();
module.exports = function termsConsent(req, res, next) {
  if (req.method !== 'POST' || !PATH_RE.test(req.path)) return next();
  const email = req.body && typeof req.body.email === 'string' ? req.body.email.trim() : null;
  res.on('finish', () => {
    if (!email || res.statusCode >= 300) return;
    Promise.resolve(init()).then(() => table && db().query(
      `UPDATE "${table}" SET terms_version = :v, terms_accepted_at = NOW() WHERE lower(email) = lower(:e) AND terms_accepted_at IS NULL`,
      { replacements: { v: TERMS_VERSION, e: email } })).catch((e) => console.error('[terms-consent] record failed:', e.message));
  });
  next();
};
