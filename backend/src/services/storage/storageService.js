'use strict';
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Storage abstraction so audio + rendered documents can move from the local
 * disk to DigitalOcean Spaces (S3) later without touching callers.
 *
 * Keys are opaque strings, e.g. "recordings/2026/09/<uuid>.webm".
 */

const baseDir = path.resolve(process.cwd(), config.storage.localDir);
fs.mkdirSync(baseDir, { recursive: true });

function datedKey(prefix, ext) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${prefix}/${y}/${m}/${uuidv4()}${ext || ''}`;
}

const localDriver = {
  async saveFromPath(srcPath, key) {
    const dest = path.join(baseDir, key);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(srcPath, dest);
    return key;
  },
  async saveBuffer(buffer, key) {
    const dest = path.join(baseDir, key);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.writeFile(dest, buffer);
    return key;
  },
  async readPath(key) {
    return path.join(baseDir, key);
  },
  async delete(key) {
    try {
      await fsp.unlink(path.join(baseDir, key));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  },
};

// Placeholder for DO Spaces (S3-compatible). Wire up @aws-sdk/client-s3 here.
const spacesDriver = {
  async saveFromPath() {
    throw new Error('Spaces driver not configured. Set STORAGE_DRIVER=local or implement spacesDriver.');
  },
  async saveBuffer() {
    throw new Error('Spaces driver not configured.');
  },
  async readPath() {
    throw new Error('Spaces driver not configured.');
  },
  async delete() {
    throw new Error('Spaces driver not configured.');
  },
};

const driver = config.storage.driver === 'spaces' ? spacesDriver : localDriver;
logger.info(`Storage driver: ${config.storage.driver}`);

module.exports = {
  driver: config.storage.driver,
  datedKey,
  saveFromPath: (...a) => driver.saveFromPath(...a),
  saveBuffer: (...a) => driver.saveBuffer(...a),
  readPath: (...a) => driver.readPath(...a),
  delete: (...a) => driver.delete(...a),
};
