'use strict';
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const ApiError = require('../utils/apiError');

const tmpDir = path.resolve(process.cwd(), config.storage.localDir, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const AUDIO_MIME = new Set([
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav',
  'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
  'audio/aac', 'audio/flac', 'application/octet-stream',
]);

function audioFilter(req, file, cb) {
  if (AUDIO_MIME.has(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest(`Unsupported audio type: ${file.mimetype}`));
}

const uploadAudio = multer({
  storage,
  fileFilter: audioFilter,
  limits: { fileSize: config.storage.maxUploadMb * 1024 * 1024 },
});

// Generic document upload for the knowledge base.
const uploadDoc = multer({
  storage,
  limits: { fileSize: config.storage.maxUploadMb * 1024 * 1024 },
});

module.exports = { uploadAudio, uploadDoc, tmpDir };
