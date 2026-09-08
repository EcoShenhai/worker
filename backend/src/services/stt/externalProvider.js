'use strict';
const ApiError = require('../../utils/apiError');

/**
 * Optional fallback for a managed STT API (e.g. Groq-hosted Whisper). Left as a
 * stub so the government deployment defaults to fully local transcription.
 * Implement here if a fallback is ever authorised.
 */
async function transcribe() {
  throw ApiError.internal('External STT provider not configured (local-only by default).');
}

module.exports = { name: 'external', transcribe };
