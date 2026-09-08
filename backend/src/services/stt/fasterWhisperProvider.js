'use strict';
const fs = require('fs');
const FormData = null; // using axios with stream instead
const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');
const ApiError = require('../../utils/apiError');

/**
 * Talks to the local faster-whisper sidecar (see /stt-service). Audio never
 * leaves the DigitalOcean host. English-only by default (STT_LANGUAGE=en).
 *
 * The sidecar returns:
 *   { text, language, duration, segments: [{start, end, text}] }
 */
async function transcribe(filePath, { language } = {}) {
  const lang = language || config.stt.language;
  const url = `${config.stt.serviceUrl.replace(/\/$/, '')}/transcribe`;

  // Multipart upload of the audio file to the sidecar.
  const form = new (require('form-data'))();
  form.append('file', fs.createReadStream(filePath));
  form.append('language', lang);
  form.append('model', config.stt.model);

  try {
    const { data } = await axios.post(url, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: config.stt.timeoutMs,
    });
    return {
      provider: 'faster-whisper',
      model: data.model || config.stt.model,
      language: data.language || lang,
      text: data.text || '',
      duration: data.duration || null,
      segments: Array.isArray(data.segments) ? data.segments : [],
    };
  } catch (e) {
    const status = e.response ? e.response.status : 'network';
    logger.error('faster-whisper transcription failed', { status, message: e.message });
    throw ApiError.internal(`Transcription failed (${status}). Is the STT sidecar running?`);
  }
}

module.exports = { name: 'faster-whisper', transcribe };
