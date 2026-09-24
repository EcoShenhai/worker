'use strict';
// Translate the frontend UI (frontend/src/i18n/locales/en.json) into Shenhai's 72 languages with DeepSeek.
// Incremental: only new or changed English strings are (re)translated. en.json and the human-curated fr.json are never touched.
// Usage: node scripts/translate-ui.js [--only=sw,am] [--concurrency=3]
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const provider = require('../src/services/ai/deepseekProvider');
const { LANGUAGE_OPTIONS } = require('../src/config/international');

const LOCALES = path.resolve(__dirname, '../../frontend/src/i18n/locales');
const CACHE_DIR = path.resolve(__dirname, '.i18n-cache');
const HUMAN = new Set(['en', 'fr']);
const CHUNK = 40;
const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1] || '';
const ONLY = arg('only').split(',').filter(Boolean);
const CONCURRENCY = Math.max(1, Number(arg('concurrency')) || 3);

const HINTS = {
  sr: 'Serbian in Cyrillic script', cnr: 'Montenegrin in Latin script', zh: 'Simplified Chinese',
  uz: 'Uzbek in Latin script', az: 'Azerbaijani in Latin script', kk: 'Kazakh in Cyrillic script',
  mn: 'Mongolian in Cyrillic script', tg: 'Tajik in Cyrillic script', bs: 'Bosnian in Latin script',
  no: 'Norwegian Bokmål', fil: 'Filipino', ms: 'Malay (Bahasa Melayu)', kl: 'Greenlandic (Kalaallisut)',
  tet: 'Tetum', dv: 'Dhivehi in Thaana script', be: 'Belarusian in Cyrillic script',
};

const flatten = (o, p = '', out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object') flatten(v, `${p}${k}.`, out); else out[`${p}${k}`] = v;
  }
  return out;
};
function unflatten(flat, orderKeys) {
  const out = {};
  for (const key of orderKeys) {
    if (flat[key] === undefined) continue;
    const parts = key.split('.');
    let o = out;
    parts.slice(0, -1).forEach((p) => { o = o[p] = o[p] || {}; });
    o[parts[parts.length - 1]] = flat[key];
  }
  return out;
}
const placeholders = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join('|');
const readJson = (p, dflt) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return dflt; } };

function systemFor(langName) {
  return [
    `You are a professional software localizer. Translate user-interface strings for "Worker", an AI administrative assistant for offices, from English into ${langName}.`,
    'Rules:',
    '- Return ONLY a JSON object with exactly the same keys as the input; each value is the translation of that key\'s English value.',
    '- Keep placeholders such as {n}, {date}, {name} exactly as written. Never translate, reorder the braces, or remove them.',
    '- Do not translate these names: Worker, EcoID, EcoBus, M-Pesa, PayPal, DeepSeek, Word, PowerPoint, Excel, PDF, CSV, Shenhai, KRA, eTIMS.',
    '- Translate "territory" with the neutral word for territory/region. Never use a word that means "country" or "nation".',
    '- Use a formal, polite register suitable for government and business users. Keep strings concise like UI labels. Keep punctuation, ellipses (…) and symbols.',
    '- Keep email addresses, URLs, phone numbers, currency codes and example codes unchanged.',
  ].join('\n');
}

async function translateBatch(langName, batch) {
  const { content, usage } = await provider.chat({ system: systemFor(langName), user: JSON.stringify(batch), temperature: 0.2, maxTokens: 8000 });
  const cleaned = String(content || '').replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  const data = JSON.parse(cleaned);
  const good = {}; const bad = [];
  for (const [k, en] of Object.entries(batch)) {
    const v = data[k];
    if (typeof v === 'string' && v.trim() && placeholders(v) === placeholders(en)) good[k] = v; else bad.push(k);
  }
  return { good, bad, usage: usage || {} };
}

async function translateLanguage(code, langName, enFlat, order) {
  const target = path.join(LOCALES, `${code}.json`);
  const cachePath = path.join(CACHE_DIR, `${code}.json`);
  const existing = flatten(readJson(target, {}));
  const cache = readJson(cachePath, {});
  const todo = Object.keys(enFlat).filter((k) => typeof enFlat[k] === 'string' && (!existing[k] || cache[k] !== enFlat[k]));
  const tokens = { in: 0, out: 0 };
  let failed = [];
  const chunks = [];
  for (let i = 0; i < todo.length; i += CHUNK) chunks.push(todo.slice(i, i + CHUNK));

  let next = 0;
  async function worker() {
    while (next < chunks.length) {
      let keys = chunks[next++];
      for (let attempt = 1; attempt <= 3 && keys.length; attempt++) {
        const batch = Object.fromEntries(keys.map((k) => [k, enFlat[k]]));
        try {
          const { good, bad, usage } = await translateBatch(langName, batch);
          Object.assign(existing, good);
          for (const k of Object.keys(good)) cache[k] = enFlat[k];
          tokens.in += usage.prompt_tokens || 0; tokens.out += usage.completion_tokens || 0;
          keys = bad;
        } catch (e) {
          if (attempt === 3) console.error(`[${code}] batch error: ${e.message}`);
        }
      }
      failed = failed.concat(keys);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length || 1) }, worker));

  for (const k of Object.keys(existing)) if (!(k in enFlat)) delete existing[k]; // drop keys removed from English
  fs.writeFileSync(target, `${JSON.stringify(unflatten(existing, order), null, 2)}\n`);
  fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
  const done = Object.keys(existing).length;
  console.log(`[${code}] ${langName}: ${done}/${order.length} strings | this run: ${todo.length - failed.length} translated, ${failed.length} fell back to English | tokens in/out ${tokens.in}/${tokens.out}`);
  return { failed: failed.length, tokens };
}

(async () => {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const en = readJson(path.join(LOCALES, 'en.json'), null);
  if (!en) throw new Error('en.json not found');
  const enFlat = flatten(en);
  const order = Object.keys(enFlat);
  const langs = LANGUAGE_OPTIONS.filter((l) => !HUMAN.has(l.code) && (!ONLY.length || ONLY.includes(l.code)));
  console.log(`Translating ${order.length} strings into ${langs.length} language(s), concurrency ${CONCURRENCY}`);
  const total = { in: 0, out: 0, failed: 0 };
  for (const l of langs) {
    const name = HINTS[l.code] || l.name;
    try {
      const r = await translateLanguage(l.code, name, enFlat, order);
      total.in += r.tokens.in; total.out += r.tokens.out; total.failed += r.failed;
    } catch (e) { console.error(`[${l.code}] FAILED: ${e.message}`); total.failed += order.length; }
  }
  console.log(`DONE: ${langs.length} language(s) | tokens in/out ${total.in}/${total.out} | strings falling back to English: ${total.failed}`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
