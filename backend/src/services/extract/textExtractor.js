'use strict';
const fs = require('fs/promises');
const path = require('path');
const logger = require('../../utils/logger');
const ocrService = require('./ocrService');

/**
 * Extract plain text from an uploaded document.
 *
 * Digital-native formats are handled here (txt, csv, docx, pdf-with-text).
 * Images and scanned PDFs (no embedded text) return an empty string with
 * needsOcr = true, so the caller can route them to the OCR sidecar (milestone B).
 *
 * Always resolves — extraction failure never throws to the caller; it returns
 * { text: '', error } so the file is still stored.
 */

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tif', '.tiff', '.bmp', '.heic']);

function guessExt(filePath, mimeType) {
  const ext = (path.extname(filePath || '') || '').toLowerCase();
  if (ext) return ext;
  if (!mimeType) return '';
  if (mimeType.includes('pdf')) return '.pdf';
  if (mimeType.includes('word') || mimeType.includes('officedocument.wordprocessing')) return '.docx';
  if (mimeType.includes('csv')) return '.csv';
  if (mimeType.startsWith('text/')) return '.txt';
  if (mimeType.startsWith('image/')) return '.' + mimeType.split('/')[1];
  return '';
}

function cleanText(t) {
  return String(t || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractText(filePath, mimeType) {
  const ext = guessExt(filePath, mimeType);
  try {
    if (ext === '.txt' || ext === '.md' || (mimeType && mimeType.startsWith('text/') && ext !== '.csv')) {
      const buf = await fs.readFile(filePath, 'utf8');
      return { text: cleanText(buf), needsOcr: false };
    }
    if (ext === '.csv' || ext === '.tsv') {
      const buf = await fs.readFile(filePath, 'utf8');
      return { text: cleanText(buf), needsOcr: false };
    }
    if (ext === '.docx') {
      const mammoth = require('mammoth');
      const { value } = await mammoth.extractRawText({ path: filePath });
      return { text: cleanText(value), needsOcr: false };
    }
    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(await fs.readFile(filePath));
      const text = cleanText(data.text);
      // A PDF that yields almost no text is likely a scan -> route to OCR.
      if (text.replace(/\s/g, '').length < 20) {
        const o = await ocrService.ocr(filePath, 'application/pdf');
        if (o.text) return { text: o.text, needsOcr: false, ocr: true };
        return { text: '', needsOcr: true };
      }
      return { text, needsOcr: false };
    }
    if (IMAGE_EXTS.has(ext) || (mimeType && mimeType.startsWith('image/'))) {
      const o = await ocrService.ocr(filePath, mimeType);
      if (o.text) return { text: o.text, needsOcr: false, ocr: true };
      return { text: '', needsOcr: true };
    }
    // Unknown/binary: store the file, no text.
    return { text: '', needsOcr: false, unsupported: true };
  } catch (e) {
    logger.error('Text extraction failed', { ext, message: e.message });
    return { text: '', needsOcr: false, error: e.message };
  }
}

module.exports = { extractText, IMAGE_EXTS };
