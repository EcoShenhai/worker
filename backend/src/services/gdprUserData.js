'use strict';
/**
 * Shenhai B2X GDPR user-data module (export = Art. 15/20, erase = Art. 17). Shared by every app backend.
 * Walks the app's Sequelize associations from User, so each app only supplies its models and options.
 *   const gdpr = require('./gdprUserData')({ sequelize, User, financial: ['Payment','Invoice','Receipt'], ... });
 *   await gdpr.exportFor(userId)  -> JSON-safe object
 *   await gdpr.eraseFor(userId)   -> { deleted: {...}, anonymised: {...} }
 */
const SECRET = /pass(word)?|hash|secret|token|publickey|private|jwk|pem|encrypted|credential|codehash|salt|otp|mfa_?secret/i;
const PII = /email|phone|mobile|msisdn|name|payer|customer|address|ip_?addr|device/i;
const DID_COLS = /(^|_)(actor|contributor|seller|owner|subject|bound)_?did$|Did$/;

module.exports = function createGdpr(opts) {
  const { sequelize, User, financial = ['Payment', 'Invoice', 'Receipt', 'Transaction'], keep = ['AuditLog', 'VfpLedger'],
    didDelete = ['MarketplaceListing'], emailDelete = ['AuthCode'], app = 'app' } = opts;
  const FIN = new Set(financial), KEEP = new Set(keep), DDEL = new Set(didDelete), EDEL = new Set(emailDelete);
  const clean = (row) => { const o = {}; for (const [k, v] of Object.entries(row)) if (!SECRET.test(k)) o[k] = v; return o; };
  const owned = () => Object.values(User.associations || {}).filter((a) => ['HasMany', 'HasOne'].includes(a.associationType));
  const dids = (u) => [u.did, u.globalEcoId, u.globalEcoIdSubject, u.global_eco_id, u.ecoid].filter(Boolean).map(String);
  const didModels = () => Object.values(sequelize.models).filter((M) => M !== User && Object.keys(M.rawAttributes).some((c) => DID_COLS.test(c)));
  const emailModels = () => Object.values(sequelize.models).filter((M) => EDEL.has(M.name) && M.rawAttributes.email);

  async function exportFor(userId) {
    const user = await User.findByPk(userId, { raw: true });
    if (!user) throw Object.assign(new Error('user not found'), { status: 404 });
    const data = {};
    for (const a of owned()) {
      const rows = await a.target.findAll({ where: { [a.foreignKey]: userId }, raw: true });
      data[a.target.name] = rows.map(clean);
      for (const b of Object.values(a.target.associations || {}).filter((x) => x.associationType === 'HasMany' && x.target !== User)) {
        const ids = rows.map((r) => r[a.target.primaryKeyAttribute]).filter(Boolean);
        if (ids.length) data[b.target.name] = (await b.target.findAll({ where: { [b.foreignKey]: ids }, raw: true })).map(clean);
      }
    }
    const ds = dids(user);
    if (ds.length) for (const M of didModels()) {
      if (data[M.name]) continue;
      const cols = Object.keys(M.rawAttributes).filter((c) => DID_COLS.test(c));
      const rows = await M.findAll({ where: { [sequelize.Sequelize.Op.or]: cols.map((c) => ({ [c]: ds })) }, raw: true, limit: 5000 });
      if (rows.length) data[M.name] = rows.map(clean);
    }
    return { app, exported_at: new Date().toISOString(), format: 'shenhai-b2x-gdpr-export/1', user: clean(user), data };
  }

  async function eraseFor(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw Object.assign(new Error('user not found'), { status: 404 });
    const ds = dids(user.get({ plain: true })), email = user.email, out = { deleted: {}, anonymised: {} };
    await sequelize.transaction(async (transaction) => {
      for (const a of owned()) {
        const M = a.target, where = { [a.foreignKey]: userId };
        if (FIN.has(M.name) || KEEP.has(M.name)) {
          if (KEEP.has(M.name)) continue;
          const set = {};
          for (const [c, def] of Object.entries(M.rawAttributes)) {
            if (c === a.foreignKey || !PII.test(c) || /number|amount|currency|date|status/i.test(c)) continue;
            set[c] = def.allowNull === false ? '[deleted]' : null;
          }
          if (Object.keys(set).length) { const [n] = await M.update(set, { where, transaction }); out.anonymised[M.name] = n; }
          continue;
        }
        for (const b of Object.values(M.associations || {}).filter((x) => x.associationType === 'HasMany' && x.target !== User)) {
          const ids = (await M.findAll({ where, attributes: [M.primaryKeyAttribute], raw: true, transaction })).map((r) => r[M.primaryKeyAttribute]);
          if (ids.length) out.deleted[b.target.name] = await b.target.destroy({ where: { [b.foreignKey]: ids }, transaction });
        }
        out.deleted[M.name] = await M.destroy({ where, transaction });
      }
      if (ds.length) for (const M of didModels().filter((x) => DDEL.has(x.name))) {
        const cols = Object.keys(M.rawAttributes).filter((c) => DID_COLS.test(c));
        out.deleted[M.name] = await M.destroy({ where: { [sequelize.Sequelize.Op.or]: cols.map((c) => ({ [c]: ds })) }, transaction });
      }
      // DID-linked financial records (e.g. payments keyed by subject_did): keep amounts, clear personal fields.
      if (ds.length) for (const M of didModels().filter((x) => FIN.has(x.name))) {
        const cols = Object.keys(M.rawAttributes).filter((c) => DID_COLS.test(c)), set = {};
        for (const [c, def] of Object.entries(M.rawAttributes)) {
          if (DID_COLS.test(c) || !PII.test(c) || /number|amount|currency|date|status/i.test(c)) continue;
          set[c] = def.allowNull === false ? '[deleted]' : null;
        }
        if (Object.keys(set).length) { const [n] = await M.update(set, { where: { [sequelize.Sequelize.Op.or]: cols.map((c) => ({ [c]: ds })) }, transaction }); out.anonymised[M.name] = (out.anonymised[M.name] || 0) + n; }
      }
      if (email) for (const M of emailModels()) out.deleted[M.name] = await M.destroy({ where: { email }, transaction });
      const set = {};
      for (const [c, def] of Object.entries(User.rawAttributes)) {
        if (c === User.primaryKeyAttribute || /createdAt|updatedAt|created_at|updated_at/.test(c)) continue;
        if (c === 'email') set[c] = `deleted+${userId}@deleted.invalid`;
        else if (/globalEcoId|global_eco_id|^did$|ecoid/i.test(c)) set[c] = def.allowNull === false ? `deleted-${userId}` : null;
        else if (SECRET.test(c) || PII.test(c)) set[c] = def.allowNull === false ? (def.type && /BOOLEAN/i.test(String(def.type)) ? false : '[deleted]') : null;
        else if (/^(status|state)$/i.test(c)) set[c] = 'deleted';
      }
      await user.update(set, { transaction });
      out.anonymised.User = 1;
    });
    console.log(`[gdpr] ${app}: user ${userId} erased`, JSON.stringify(out));
    return out;
  }
  return { exportFor, eraseFor };
};
