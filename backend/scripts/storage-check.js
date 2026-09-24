'use strict';
// Real write/read/delete test against the configured Space. Usage: node scripts/storage-check.js
require('dotenv').config();
const config = require('../src/config');
const { spacesConfigProblems, createSpacesDriver } = require('../src/services/storage/spacesDriver');

(async () => {
  const problems = spacesConfigProblems(config.storage.spaces);
  if (problems.length) {
    console.log('Spaces not configured yet:', problems.join(', '));
    console.log('Fill in the SPACES_* values in .env, then run this again.');
    process.exit(1);
  }
  const noLocal = { readPath: async () => null, delete: async () => {} };
  const d = createSpacesDriver(config.storage.spaces, noLocal);
  const key = `healthcheck/worker-${Date.now()}.txt`;
  const body = Buffer.from(`worker storage check ${new Date().toISOString()}`);
  await d.saveBuffer(body, key);
  const head = await d.head(key);
  const back = require('fs').readFileSync(await d.readPath(key));
  await d.delete(key);
  const ok = Number(head.ContentLength) === body.length && back.equals(body);
  console.log(ok ? 'SPACES OK: write, read and delete all succeeded' : 'SPACES MISMATCH: content check failed');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('SPACES ERROR:', e.name || '', e.message); process.exit(1); });
