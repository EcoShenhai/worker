'use strict';

// Worker territory & language options, rendered natively.
// Registry source: CPAMind (territories.js, languages.js, territoryLanguages.js are unmodified copies;
// refresh them from /srv/apps/cpamind/backend/src/config/international and diff to detect drift).
// UI wording rule: always "territory", never "country".
const { TERRITORIES } = require('./territories');
const { LANGUAGES } = require('./languages');
const { TERRITORY_TO_LANGUAGES } = require('./territoryLanguages');
const { sttFor } = require('./stt');

const TERRITORY_NATIVE_OVERRIDES = {
  HK: 'Hong Kong / 香港',
  MO: '澳門',
  PS: 'فلسطين',
  MV: 'ދިވެހިރާއްޖެ',
  TL: "Timor-Leste / Timor Lorosa'e",
  CD: 'République démocratique du Congo',
  CG: 'République du Congo',
  FI: 'Suomi / Finland',
  KZ: 'Қазақстан / Казахстан',
};

const LANGUAGE_NATIVE_OVERRIDES = {
  cnr: 'crnogorski',
  dv: 'ދިވެހި',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  tet: 'Tetun',
};

function displayName(locale, type, code) {
  try { return new Intl.DisplayNames([locale], { type }).of(code); } catch (e) { return null; }
}

function territoryNative(t) {
  if (TERRITORY_NATIVE_OVERRIDES[t.code]) return TERRITORY_NATIVE_OVERRIDES[t.code];
  const langs = TERRITORY_TO_LANGUAGES[t.code] || [];
  const names = langs
    .map((l) => (l === 'en' ? t.name : displayName(`${l}-${t.code}`, 'region', t.code)))
    .filter(Boolean);
  return [...new Set(names)].join(' / ') || t.name;
}

function languageNative(l) {
  return LANGUAGE_NATIVE_OVERRIDES[l.code] || displayName(l.code, 'language', l.code) || l.name;
}

const TERRITORY_OPTIONS = TERRITORIES
  .map((t) => ({ code: t.code, name: t.name, native: territoryNative(t), languages: TERRITORY_TO_LANGUAGES[t.code] || [] }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ code: l.code, name: l.name, native: languageNative(l), ...sttFor(l.code) }));

const TERRITORY_CODES = new Set(TERRITORY_OPTIONS.map((t) => t.code));
const LANGUAGE_CODES = new Set(LANGUAGE_OPTIONS.map((l) => l.code));

module.exports = { TERRITORY_OPTIONS, LANGUAGE_OPTIONS, TERRITORY_CODES, LANGUAGE_CODES };
