'use strict';
const { resolveSttLanguage } = require('../utils/international');
const fs = require('fs/promises');
const fss = require('fs');
const path = require('path');
const { WorkspaceSession, Recording, Transcript, TranscriptSegment, sequelize } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const storage = require('../services/storage/storageService');
const STTService = require('../services/stt/STTService');
const audit = require('../services/audit/auditService');
const logger = require('../utils/logger');
const transcriptionQueue = require('../services/stt/transcriptionQueue');
const { owns } = require('../utils/tenancy');

// Load a recording and confirm the caller's tenant owns its session.
async function recordingInTenant(req, id) {
  const recording = await Recording.findByPk(id, { include: [{ model: WorkspaceSession, as: 'session' }] });
  if (!recording) return null;
  if (!owns(req, recording.session)) return null;
  return recording;
}

// POST /sessions/:sessionId/recordings  (multipart: file)
const upload = asyncHandler(async (req, res) => {
  const session = await WorkspaceSession.findByPk(req.params.sessionId);
  if (!owns(req, session)) throw ApiError.notFound('Session not found');
  if (!req.file) throw ApiError.badRequest('Audio file is required (field name: file)');

  const ext = path.extname(req.file.originalname || '') || '.webm';
  const key = storage.datedKey('recordings', ext);
  await storage.saveFromPath(req.file.path, key);
  await fs.unlink(req.file.path).catch(() => {});

  const recording = await Recording.create({
    sessionId: session.id,
    uploadedById: req.user.id,
    source: req.body.source === 'uploaded' ? 'uploaded' : 'recorded',
    originalFilename: req.file.originalname || null,
    storageKey: key,
    storageDriver: storage.driver,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    status: 'pending',
  });

  await audit.record(req, 'recording.upload', {
    resourceType: 'recording',
    resourceId: recording.id,
    metadata: { sessionId: session.id, sizeBytes: req.file.size },
  });
  transcriptionQueue.kick(); // auto-transcribe in the background
  res.status(201).json({ recording });
});

// POST /recordings/:id/transcribe  (synchronous; for long files move to a job queue)
// POST /recordings/:id/transcribe  -> queue (or retry) background transcription; returns immediately
const transcribe = asyncHandler(async (req, res) => {
  const recording = await recordingInTenant(req, req.params.id);
  if (!recording) throw ApiError.notFound('Recording not found');
  if (recording.status === 'transcribing') throw ApiError.conflict('Already transcribing');
  await resolveSttLanguage(recording); // fail fast on an unsupported recording language
  recording.status = 'pending';
  recording.error = null;
  await recording.save();
  await audit.record(req, 'recording.queued', { resourceType: 'recording', resourceId: recording.id });
  transcriptionQueue.kick();
  res.status(202).json({ recording, queued: true });
});

// GET /recordings/:id/transcript
const getTranscript = asyncHandler(async (req, res) => {
  const rec = await recordingInTenant(req, req.params.id);
  if (!rec) throw ApiError.notFound('Transcript not found');
  const transcript = await Transcript.findOne({
    where: { recordingId: req.params.id },
    include: [{ model: TranscriptSegment, as: 'segments' }],
    order: [[{ model: TranscriptSegment, as: 'segments' }, 'idx', 'ASC']],
  });
  if (!transcript) throw ApiError.notFound('Transcript not found');
  res.json({ transcript });
});

// PUT /transcripts/:id  (officer verification / correction)
const verifyTranscript = asyncHandler(async (req, res) => {
  const transcript = await Transcript.findByPk(req.params.id, { include: [{ model: WorkspaceSession, as: 'session' }] });
  if (!transcript || !owns(req, transcript.session)) throw ApiError.notFound('Transcript not found');
  if (req.body.editedText !== undefined) transcript.editedText = req.body.editedText;
  if (req.body.verified !== undefined) {
    transcript.verified = !!req.body.verified;
    transcript.verifiedById = transcript.verified ? req.user.id : null;
  }
  await transcript.save();
  await audit.record(req, 'transcript.verify', {
    resourceType: 'transcript',
    resourceId: transcript.id,
    metadata: { verified: transcript.verified },
  });
  res.json({ transcript });
});

// GET /recordings/:id/audio  (stream, supports Range for seeking)
const audio = asyncHandler(async (req, res) => {
  const recording = await recordingInTenant(req, req.params.id);
  if (!recording) throw ApiError.notFound('Recording not found');
  const abs = await storage.readPath(recording.storageKey);
  let stat;
  try { stat = fss.statSync(abs); } catch (e) { throw ApiError.notFound('Audio file not found'); }
  const type = recording.mimeType || 'audio/webm';
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
    if (start >= stat.size || end >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': type,
    });
    fss.createReadStream(abs, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': type, 'Accept-Ranges': 'bytes' });
    fss.createReadStream(abs).pipe(res);
  }
});

// PATCH /recordings/:id/include  { includeInMinutes: boolean }
const setInclude = asyncHandler(async (req, res) => {
  const recording = await recordingInTenant(req, req.params.id);
  if (!recording) throw ApiError.notFound('Recording not found');
  recording.includeInMinutes = !!req.body.includeInMinutes;
  await recording.save();
  await audit.record(req, 'recording.include_toggle', {
    resourceType: 'recording',
    resourceId: recording.id,
    metadata: { includeInMinutes: recording.includeInMinutes },
  });
  res.json({ recording });
});

module.exports = { upload, transcribe, getTranscript, verifyTranscript, audio, setInclude };
