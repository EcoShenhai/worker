'use strict';

// DigitalOcean Spaces (S3-compatible) storage driver. Objects are private; downloads stream via the API.
// readPath() returns a local file path (STT, audio streaming and exports need one):
//   1) local fallback for files not yet migrated, 2) otherwise a one-time download into a temp cache.
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');

const PLACEHOLDER = /CHANGE_ME/i;
const FIELDS = ['endpoint', 'region', 'bucket', 'key', 'secret'];

function spacesConfigProblems(c = {}) {
  return FIELDS.filter((k) => !c[k] || PLACEHOLDER.test(String(c[k]))).map((k) => `SPACES_${k.toUpperCase()} not set`);
}

function createSpacesDriver(c, localDriver) {
  const { S3Client, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
  const { Upload } = require('@aws-sdk/lib-storage');
  const client = new S3Client({
    endpoint: c.endpoint,
    region: c.region,
    credentials: { accessKeyId: c.key, secretAccessKey: c.secret },
  });
  const CACHE = path.join(os.tmpdir(), 'worker-spaces-cache');
  const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  async function put(key, Body) {
    await new Upload({ client, params: { Bucket: c.bucket, Key: key, Body, ACL: 'private' } }).done();
    return key;
  }

  async function localFallback(key) {
    try {
      const p = await localDriver.readPath(key);
      if (p && fs.existsSync(p)) return p;
    } catch (e) { /* not local */ }
    return null;
  }

  async function sweepCache(dir = CACHE) {
    let entries = [];
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await sweepCache(p);
      else {
        const st = await fsp.stat(p).catch(() => null);
        if (st && Date.now() - st.mtimeMs > CACHE_MAX_AGE_MS) await fsp.rm(p, { force: true }).catch(() => {});
      }
    }
  }
  const sweeper = setInterval(() => { sweepCache(); }, 60 * 60 * 1000);
  if (sweeper.unref) sweeper.unref();

  return {
    async saveFromPath(srcPath, key) { return put(key, fs.createReadStream(srcPath)); },
    async saveBuffer(buffer, key) { return put(key, buffer); },
    async readPath(key) {
      const local = await localFallback(key);
      if (local) return local;
      const dest = path.join(CACHE, key);
      if (fs.existsSync(dest)) return dest;
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      const res = await client.send(new GetObjectCommand({ Bucket: c.bucket, Key: key }));
      const tmp = `${dest}.part`;
      await new Promise((resolve, reject) => {
        const w = fs.createWriteStream(tmp);
        res.Body.on('error', reject);
        w.on('error', reject);
        w.on('finish', resolve);
        res.Body.pipe(w);
      });
      await fsp.rename(tmp, dest);
      return dest;
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: key })).catch(() => {});
      try { await localDriver.delete(key); } catch (e) { /* not local */ }
      await fsp.rm(path.join(CACHE, key), { force: true }).catch(() => {});
    },
    async head(key) { return client.send(new HeadObjectCommand({ Bucket: c.bucket, Key: key })); },
  };
}

module.exports = { createSpacesDriver, spacesConfigProblems };
