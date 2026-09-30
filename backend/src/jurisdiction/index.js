'use strict';
// Canonical Localization JSONB (v8, 205 territories). Territory rules are read from here, never hard-coded.
const fs = require('fs'); const path = require('path');
const DIR = path.join(__dirname, 'territories'); const cache = new Map();
const DEFAULT = (process.env.DEFAULT_TERRITORY || 'KE').toUpperCase();
function read(code) {
  const c = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  if (cache.has(c)) return cache.get(c);
  const f = path.join(DIR, `${c}.json`); if (!fs.existsSync(f)) return null;
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); cache.set(c, j); return j;
}
function get(code) { const c = String(code || '').toUpperCase(); const j = read(c); return j ? { code: c, jsonb: j } : { code: DEFAULT, jsonb: read(DEFAULT), fallback: true }; }
function list() { return fs.readdirSync(DIR).filter((f) => /^[A-Z]{2}\.json$/.test(f)).map((f) => f.slice(0, 2)); }
module.exports = { get, read, list, DEFAULT };
