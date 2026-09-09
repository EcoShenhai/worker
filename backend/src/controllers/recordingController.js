'use strict';
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

// POST /sessions/:sessionId/recordings  (multipart: file)
const upload = asyncHandler(async (req, res) => {
  const session = await WorkspaceSession.findByPk(req.params.sessionId);
  if (!session) throw ApiError.notFound('Session not found');
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
  res.status(201).json({ recording });
});

// POST /recordings/:id/transcribe  (synchronous; for long files move to a job queue)
const transcribe = asyncHandler(async (req, res) => {
  const recording = await Recording.findByPk(req.params.id);
  if (!recording) throw ApiError.notFound('Recording not found');
  if (recording.status === 'transcribing') throw ApiError.conflict('Already transcribing');

  recording.status = 'transcribing';
  recording.error = null;
  await recording.save();

  const filePath = await storage.readPath(recording.storageKey);

  try {
    const result = await STTService.transcribe(filePath, {});
    const t = await sequelize.transaction(async (tx) => {
      // Replace any prior transcript for this recording.
      await Transcript.destroy({ where: { recordingId: recording.id }, transaction: tx });
      const transcript = await Transcript.create(
        {
          recordingId: recording.id,
          sessionId: recording.sessionId,
          provider: result.provider,
          model: result.model,
          language: result.language,
          rawText: result.text,
          wordCount: result.text ? result.text.split(/\s+/).length : 0,
        },
        { transaction: tx }
      );
      if (Array.isArray(result.segments) && result.segments.length) {
        await TranscriptSegment.bulkCreate(
          result.segments.map((s, i) => ({
            transcriptId: transcript.id,
            idx: i,
            startSeconds: s.start,
            endSeconds: s.end,
            speaker: s.speaker || null,
            text: s.text,
          })),
          { transaction: tx }
        );
      }
      return transcript;
    });

    recording.status = 'transcribed';
    if (result.duration) recording.durationSeconds = Math.round(result.duration);
    await recording.save();

    await audit.record(req, 'recording.transcribed', {
      resourceType: 'recording',
      resourceId: recording.id,
      metadata: { provider: result.provider, wordCount: t.wordCount },
    });
    res.json({ transcript: t });
  } catch (e) {
    recording.status = 'failed';
    recording.error = e.message;
    await recording.save();
    logger.error('Transcription failed', { recordingId: recording.id, message: e.message });
    throw e;
  }
});

// GET /recordings/:id/transcript
const getTranscript = asyncHandler(async (req, res) => {
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
  const transcript = await Transcript.findByPk(req.params.id);
  if (!transcript) throw ApiError.notFound('Transcript not found');
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
  const recording = await Recording.findByPk(req.params.id);
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
  const recording = await Recording.findByPk(req.params.id);
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
