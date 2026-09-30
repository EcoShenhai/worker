'use strict';
/**
 * Shenhai B2X transactional email translation (72 canonical languages).
 * install() hooks nodemailer's shared Mail.prototype.sendMail once per process, so every
 * transporter the app creates (before or after install) is covered without touching mail code.
 * Recognises verification / sign-in code / password reset / receipt emails by their English subject,
 * re-renders subject + a localised lead paragraph in the recipient's language, and keeps the
 * original message below it. Anything unrecognised, or English recipients, pass through unchanged.
 */
const fs = require('fs');
const path = require('path');
const CAT = require('./mail-catalog.json');
const TERR = require('./territory-languages.json');
const KEYS = CAT._keys;
const LANGS = new Set(Object.keys(CAT).filter((k) => !k.startsWith('_')));
const ALIAS = { nb: 'no', nn: 'no', tl: 'fil', iw: 'he', in: 'id' };
const RTL = new Set(['ar', 'he', 'fa', 'ur', 'dv']);

function normLang(l) {
  if (!l) return null;
  const base = String(l).toLowerCase().replace('_', '-').split('-')[0];
  const a = ALIAS[base] || base;
  return LANGS.has(a) ? a : null;
}
function t(lang, key, vars) {
  const i = KEYS.indexOf(key);
  const tpl = (CAT[lang] && CAT[lang][i]) || CAT.en[i];
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
}
function kindOf(subject) {
  const s = String(subject || '');
  if (/reset|password/i.test(s)) return 'reset';
  if (/sign-?in code|login code|verification code|one-?time|\botp\b/i.test(s)) return 'code';
  if (/\bverify\b|confirm your email/i.test(s)) return 'verify';
  if (/payment received|receipt/i.test(s)) return 'receipt';
  return null;
}
const stripHtml = (h) => String(h || '').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function extract(msg) {
  const body = `${msg.text || ''} ${stripHtml(msg.html)}`;
  const link = (String(msg.html || '').match(/href="(https?:\/\/[^"]+)"/i) || body.match(/https?:\/\/\S+/i) || [])[1] || (body.match(/https?:\/\/\S+/i) || [])[0];
  // prefer a 6-digit code; otherwise 4-8 digits that are not a year (e.g. a footer's © 2026)
  const code = (body.match(/\b\d{6}\b/) || body.match(/\b(?!(?:19|20)\d{2}\b)\d{4,8}\b/) || [])[0];
  const ref = (String(msg.subject || '').match(/(?:receipt|[-–])\s*([A-Z0-9][A-Z0-9-]{3,})\s*$/i) || body.match(/\b(RCT-[\w-]+|RC-[\w-]+)\b/) || [])[1];
  const amount = (body.match(/\b([A-Z]{3}\s?[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s?[A-Z]{3})\b/) || [])[1];
  return { link: link && link.replace(/[).,]+$/, ''), code, ref, amount };
}
function firstAddress(to) {
  const s = Array.isArray(to) ? to[0] : to;
  const v = s && typeof s === 'object' ? s.address : s;
  const m = String(v || '').match(/[^<\s,]+@[^>\s,]+/);
  return m ? m[0].toLowerCase() : null;
}
function makeLookup(appRoot) {
  let ctrl = null;
  return async (email) => {
    try {
      if (!ctrl) ctrl = require(path.join(appRoot, 'src', 'controllers', 'privacyController'))._load();
      const U = ctrl && ctrl.User; if (!U || !U.rawAttributes.email) return null;
      return await U.findOne({ where: { email }, raw: true });
    } catch (e) { return null; }
  };
}
async function pickLang(msg, lookup) {
  const forced = normLang(process.env.MAIL_I18N_FORCE_LANG); if (forced) return forced;
  const email = firstAddress(msg.to); if (!email) return null;
  const u = await Promise.race([lookup(email), new Promise((r) => setTimeout(() => r(null), 1500))]);
  if (u) {
    for (const f of ['preferred_language', 'preferredLanguage', 'language', 'locale', 'lang']) { const l = normLang(u[f]); if (l) return l; }
    for (const f of ['territory', 'territory_code', 'territoryCode', 'country', 'country_code']) { const c = u[f] && String(u[f]).toUpperCase(); if (c && TERR[c]) return TERR[c]; }
  }
  return normLang(process.env.MAIL_DEFAULT_LANG) || null;
}
async function localize(msg, app, lookup) {
  if (process.env.MAIL_I18N_DISABLED === 'true' || !msg || !msg.subject) return msg;
  const kind = kindOf(msg.subject); if (!kind) return msg;
  const lang = await pickLang(msg, lookup); if (!lang || lang === 'en') return msg;
  const v = { app, ...extract(msg) };
  let subject, lead;
  if (kind === 'verify') { subject = t(lang, 'verify_subject', v); lead = v.link ? t(lang, 'verify_link', v) : v.code ? t(lang, 'verify_code', v) : null; }
  if (kind === 'code') { subject = t(lang, 'code_subject', v); lead = v.code ? t(lang, 'code_body', v) : null; }
  if (kind === 'reset') { subject = t(lang, 'reset_subject', v); lead = v.link ? t(lang, 'reset_link', v) : v.code ? t(lang, 'reset_code', v) : null; }
  if (kind === 'receipt') { if (!v.ref) v.ref = ''; subject = t(lang, 'receipt_subject', v).replace(/\s+[–-]\s*\S*\s*$/, (m) => (v.ref ? m : '')); lead = v.amount ? t(lang, 'receipt_body', { ...v, ref: v.ref || '—' }) : null; }
  const out = { ...msg, subject };
  if (lead) {
    const ignore = kind === 'receipt' ? '' : t(lang, 'ignore', v);
    const dir = RTL.has(lang) ? ' dir="rtl"' : '';
    if (msg.html) out.html = `<div${dir} lang="${lang}"><p>${esc(lead)}</p>${ignore ? `<p style="color:#6b7280">${esc(ignore)}</p>` : ''}</div><hr style="border:0;border-top:1px solid #e5e7eb;margin:16px 0">${msg.html}`;
    if (msg.text || !msg.html) out.text = `${lead}${ignore ? `\n\n${ignore}` : ''}\n\n---\n${msg.text || stripHtml(msg.html)}`;
  }
  out.headers = { ...(msg.headers || {}), 'Content-Language': lang };
  return out;
}
function install({ app, appRoot = process.cwd(), lookup } = {}) {
  let Mailer;
  try { Mailer = require(require.resolve('nodemailer/lib/mailer', { paths: [appRoot, __dirname] })); } catch (e) { console.warn('[mail-i18n] nodemailer not found; not installed'); return false; }
  if (Mailer.prototype.__b2xMailI18n) return true;
  const orig = Mailer.prototype.sendMail; const look = lookup || makeLookup(appRoot);
  Mailer.prototype.sendMail = function sendMail(msg, cb) {
    const self = this;
    const p = localize(msg, app, look).catch(() => msg).then((m) => orig.call(self, m));
    if (typeof cb === 'function') { p.then((info) => cb(null, info), cb); return undefined; }
    return p;
  };
  Mailer.prototype.__b2xMailI18n = true;
  console.log(`[mail-i18n] ${app}: transactional emails localised (${LANGS.size} languages)`);
  return true;
}
module.exports = { install, localize, t, kindOf, normLang, languages: [...LANGS] };
