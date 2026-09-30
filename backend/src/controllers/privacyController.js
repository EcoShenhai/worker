'use strict';
// GDPR self-service for worker: download my data (Art. 15/20) and delete my account (Art. 17).
const createGdpr = require('../services/gdprUserData');
const CFG = {"financial": ["Payment", "Invoice", "Receipt"], "keep": ["Email", "WorkspaceSession"]};
let inst = null;
function load() {
  if (inst) return inst;
  let sq = null;
  for (const p of ['../models', '../models/index', '../db/connection', '../config/database']) {
    try { const m = require(p); const c = [m.sequelize, m.default, m, ...Object.values(m).map((v) => v && v.sequelize)];
      sq = c.find((x) => x && x.models && typeof x.query === 'function' && Object.keys(x.models).length); if (sq) break; } catch (e) { /* next */ }
  }
  if (!sq) throw Object.assign(new Error('models not available'), { status: 500 });
  const User = sq.models.User || sq.models.users || Object.values(sq.models).find((M) => /^users?$/i.test(String(M.getTableName())));
  inst = { User, gdpr: createGdpr({ sequelize: sq, User, app: 'worker', ...CFG }) };
  return inst;
}
async function currentUser(req, User) {
  const a = req.user || req.auth || (req.session && req.session.user) || {};
  const pk = User.primaryKeyAttribute, attrs = User.rawAttributes, tries = [];
  for (const v of [a[pk], a.id, a.userId, a.user_id, a.uid, a.sub]) tries.push([pk, v]);
  tries.push(['email', a.email]);
  for (const c of ['globalEcoId', 'global_eco_id', 'did', 'ecoid']) tries.push([c, a.globalEcoId || a.global_eco_id || a.did || a.ecoid]);
  for (const [col, val] of tries) {
    if (!val || !attrs[col]) continue;
    const u = await User.findOne({ where: { [col]: val } }).catch(() => null); if (u) return u;
  }
  throw Object.assign(new Error('not signed in'), { status: 401 });
}
exports.exportMine = async (req, res) => {
  const { User, gdpr } = load(); const u = await currentUser(req, User);
  res.setHeader('Content-Disposition', `attachment; filename="worker-my-data-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(await gdpr.exportFor(u[User.primaryKeyAttribute]));
};
exports.deleteMine = async (req, res) => {
  if (!req.body || req.body.confirm !== 'DELETE') return res.status(400).json({ error: 'confirmation_required', message: 'Send {"confirm":"DELETE"} to delete your account.' });
  const { User, gdpr } = load(); const u = await currentUser(req, User);
  res.json({ ok: true, deleted: true, summary: await gdpr.eraseFor(u[User.primaryKeyAttribute]) });
};
exports._load = load;
