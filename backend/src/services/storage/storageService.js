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

// DigitalOcean Spaces: used only when STORAGE_DRIVER=spaces AND every SPACES_* value is set (no CHANGE_ME).
// Otherwise stay on local storage and log why, never crash and never run half-configured.
const { createSpacesDriver, spacesConfigProblems } = require('./spacesDriver');
let activeDriver = 'local';
let driver = localDriver;
if (config.storage.driver === 'spaces') {
  const problems = spacesConfigProblems(config.storage.spaces);
  if (problems.length) {
    logger.error(`Spaces storage requested but not configured (${problems.join(', ')}). Using local storage.`);
  } else {
    driver = createSpacesDriver(config.storage.spaces, localDriver);
    activeDriver = 'spaces';
  }
}
logger.info(`Storage driver: ${activeDriver}`);

module.exports = {
  driver: activeDriver,
  datedKey,
  saveFromPath: (...a) => driver.saveFromPath(...a),
  saveBuffer: (...a) => driver.saveBuffer(...a),
  readPath: (...a) => driver.readPath(...a),
  delete: (...a) => driver.delete(...a),
};
