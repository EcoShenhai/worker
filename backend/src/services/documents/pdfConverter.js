'use strict';

// Word -> PDF via headless LibreOffice, so the PDF matches the Word export exactly
// (letterhead, logo, e-signature, layout). One conversion at a time to protect the shared host.
const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const SOFFICE = process.env.SOFFICE_PATH || '/usr/bin/soffice';
const TIMEOUT_MS = 90 * 1000;
// Worker's own LibreOffice profile: never collides with other apps on the host.
const PROFILE_DIR = path.join(os.tmpdir(), 'worker-soffice-profile');

let chain = Promise.resolve();

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) reject(new Error(`PDF conversion failed: ${err.killed ? 'timed out' : err.message} ${stderr || ''}`.trim()));
      else resolve(`${stdout || ''}\n${stderr || ''}`);
    });
  });
}

async function convertOnce(docxBuffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'worker-pdf-'));
  try {
    const input = path.join(dir, 'document.docx');
    await fs.writeFile(input, docxBuffer);
    const out = await run(SOFFICE, [
      `-env:UserInstallation=file://${PROFILE_DIR}`,
      '--headless', '--norestore', '--nolockcheck',
      '--convert-to', 'pdf', '--outdir', dir, input,
    ], { timeout: TIMEOUT_MS, killSignal: 'SIGKILL' });
    try {
      return await fs.readFile(path.join(dir, 'document.pdf'));
    } catch (e) {
      const msg = String(out || '').split('\n').filter((l) => l.trim() && !/javaldx/.test(l)).join(' ').trim();
      throw new Error(`PDF conversion failed: ${msg || 'no output produced'}`);
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function docxToPdf(docxBuffer) {
  const job = chain.then(() => convertOnce(docxBuffer));
  chain = job.catch(() => {});
  return job;
}

module.exports = { docxToPdf };
