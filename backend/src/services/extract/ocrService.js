'use strict';
const { execFile } = require('child_process');
const fs = require('fs/promises');
const fss = require('fs');
const os = require('os');
const path = require('path');
const logger = require('../../utils/logger');

/**
 * OCR via the system `tesseract` binary (no Python sidecar needed).
 * Images are OCR'd directly; scanned PDFs are rasterised with `pdftoppm`
 * (poppler) a few pages at a time and each page is OCR'd.
 *
 * Controlled by OCR_ENABLED (default enabled). Always resolves; on any error
 * it returns '' so callers degrade gracefully.
 */

const LANG = process.env.OCR_LANG || 'eng';
const MAX_PDF_PAGES = parseInt(process.env.OCR_MAX_PDF_PAGES || '15', 10);
const TIMEOUT_MS = parseInt(process.env.OCR_TIMEOUT_MS || '120000', 10);

function isEnabled() {
  return process.env.OCR_ENABLED !== 'false';
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${cmd} failed: ${err.message} ${stderr || ''}`));
      resolve(stdout);
    });
  });
}

function clean(t) {
  return String(t || '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// OCR a single image file -> text
async function ocrImage(filePath) {
  // `tesseract <img> stdout -l eng` prints recognised text to stdout.
  const out = await run('tesseract', [filePath, 'stdout', '-l', LANG]);
  return clean(out);
}

// OCR a (scanned) PDF: rasterise pages to PNG then OCR each.
async function ocrPdf(filePath) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'worker-ocr-'));
  const prefix = path.join(dir, 'page');
  try {
    // -r 200 dpi, cap pages for time/memory.
    await run('pdftoppm', ['-png', '-r', '200', '-l', String(MAX_PDF_PAGES), filePath, prefix]);
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.png')).sort();
    const parts = [];
    for (const f of files) {
      try {
        parts.push(await ocrImage(path.join(dir, f)));
      } catch (e) {
        logger.error('OCR page failed', { message: e.message });
      }
    }
    return clean(parts.join('\n\n'));
  } finally {
    // best-effort cleanup
    try {
      for (const f of await fs.readdir(dir)) await fs.unlink(path.join(dir, f)).catch(() => {});
      await fs.rmdir(dir).catch(() => {});
    } catch (e) { /* ignore */ }
  }
}

/**
 * OCR a file by type. Returns { text }.
 */
async function ocr(filePath, mimeType) {
  if (!isEnabled()) return { text: '', disabled: true };
  const ext = (path.extname(filePath || '') || '').toLowerCase();
  try {
    if (!fss.existsSync(filePath)) return { text: '' };
    if (ext === '.pdf' || (mimeType && mimeType.includes('pdf'))) {
      return { text: await ocrPdf(filePath) };
    }
    return { text: await ocrImage(filePath) };
  } catch (e) {
    logger.error('OCR failed', { message: e.message });
    return { text: '', error: e.message };
  }
}

module.exports = { ocr, ocrImage, ocrPdf, isEnabled };
