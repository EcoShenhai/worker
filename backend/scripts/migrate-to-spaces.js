'use strict';
// Copy local storage to Spaces. Dry-run by default; --apply uploads and verifies sizes. Never deletes local files.
// Usage: node scripts/migrate-to-spaces.js [--apply]
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { spacesConfigProblems, createSpacesDriver } = require('../src/services/storage/spacesDriver');

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(process.cwd(), config.storage.localDir);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'tmp') walk(p, out); } else out.push(p);
  }
  return out;
}

(async () => {
  if (!fs.existsSync(ROOT)) { console.log('No local storage folder at', ROOT); process.exit(0); }
  const files = walk(ROOT);
  const bytes = files.reduce((s, f) => s + fs.statSync(f).size, 0);
  const byTop = {};
  for (const f of files) { const top = path.relative(ROOT, f).split(path.sep)[0]; byTop[top] = (byTop[top] || 0) + 1; }
  console.log(`Local storage: ${ROOT}`);
  console.log(`Files: ${files.length} (${(bytes / 1048576).toFixed(1)} MB) by folder:`, byTop);

  const { Recording } = require('../src/models');
  const recs = await Recording.findAll({ attributes: ['storageKey'] });
  const found = recs.filter((r) => r.storageKey && fs.existsSync(path.join(ROOT, r.storageKey))).length;
  console.log(`Key check: ${found}/${recs.length} recording keys resolve to local files`);

  if (!APPLY) { console.log('Dry run only. Re-run with --apply once Spaces is configured.'); process.exit(0); }
  const problems = spacesConfigProblems(config.storage.spaces);
  if (problems.length) { console.log('Spaces not configured:', problems.join(', ')); process.exit(1); }

  const d = createSpacesDriver(config.storage.spaces, { readPath: async () => null, delete: async () => {} });
  let copied = 0; let skipped = 0; let failed = 0;
  for (const f of files) {
    const key = path.relative(ROOT, f).split(path.sep).join('/');
    const size = fs.statSync(f).size;
    try {
      const head = await d.head(key).catch(() => null);
      if (head && Number(head.ContentLength) === size) { skipped++; continue; }
      await d.saveFromPath(f, key);
      const after = await d.head(key);
      if (Number(after.ContentLength) !== size) throw new Error('size mismatch after upload');
      copied++;
    } catch (e) { failed++; console.error('FAILED', key, e.message); }
  }
  console.log(`Done. copied=${copied} already_there=${skipped} failed=${failed}. Local files were not deleted.`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
