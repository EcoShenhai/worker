'use strict';

// Background transcription: DB-backed, one job at a time (protects the shared CPU), restart-safe.
// Status flow: pending (queued) -> transcribing -> transcribed | failed
const { Recording, Transcript, TranscriptSegment, sequelize } = require('../../models');
const storage = require('../storage/storageService');
const STTService = require('./STTService');
const audit = require('../audit/auditService');
const logger = require('../../utils/logger');
const { resolveSttLanguage } = require('../../utils/international');

const POLL_MS = 15 * 1000;
let draining = false;
let started = false;

// Atomically claim the oldest pending recording (never processed twice).
async function claimNext() {
  const [rows] = await sequelize.query(
    `UPDATE recordings SET status = 'transcribing', error = NULL, "updatedAt" = now()
     WHERE id = (SELECT id FROM recordings WHERE status = 'pending' ORDER BY "createdAt" ASC LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING id`
  );
  return rows.length ? rows[0].id : null;
}

async function processRecording(id) {
  const recording = await Recording.findByPk(id);
  if (!recording) return;
  try {
    const sttLanguage = await resolveSttLanguage(recording);
    const filePath = await storage.readPath(recording.storageKey);
    const result = await STTService.transcribe(filePath, { language: sttLanguage });
    const transcript = await sequelize.transaction(async (tx) => {
      await Transcript.destroy({ where: { recordingId: recording.id }, transaction: tx });
      const t = await Transcript.create(
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
            transcriptId: t.id,
            idx: i,
            startSeconds: s.start,
            endSeconds: s.end,
            speaker: s.speaker || null,
            text: s.text,
          })),
          { transaction: tx }
        );
      }
      return t;
    });
    recording.status = 'transcribed';
    recording.error = null;
    if (result.duration) recording.durationSeconds = Math.round(result.duration);
    await recording.save();
    try {
      await audit.record(null, 'recording.transcribed', {
        resourceType: 'recording',
        resourceId: recording.id,
        metadata: { provider: result.provider, model: result.model, wordCount: transcript.wordCount, background: true },
      });
    } catch (e) { /* audit must never fail the job */ }
    logger.info('Transcription done', { recordingId: recording.id, words: transcript.wordCount, model: result.model });
  } catch (e) {
    recording.status = 'failed';
    recording.error = String(e.message || e).slice(0, 500);
    await recording.save();
    logger.error('Transcription failed', { recordingId: recording.id, message: recording.error });
  }
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    for (;;) {
      const id = await claimNext();
      if (!id) break;
      await processRecording(id);
    }
  } catch (e) {
    logger.error('Transcription queue error', { message: e.message });
  } finally {
    draining = false;
  }
}

function kick() {
  setImmediate(() => { drain(); });
}

async function start() {
  if (started) return;
  started = true;
  // Jobs interrupted by a restart go back to the queue.
  const [reset] = await sequelize.query(
    `UPDATE recordings SET status = 'pending', "updatedAt" = now() WHERE status = 'transcribing' RETURNING id`
  );
  const timer = setInterval(drain, POLL_MS);
  if (timer.unref) timer.unref();
  logger.info('Transcription queue started', { requeued: reset.length });
  kick();
}

module.exports = { start, kick, drain };
