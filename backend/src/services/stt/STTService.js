'use strict';
const config = require('../../config');
const fasterWhisper = require('./fasterWhisperProvider');
const external = require('./externalProvider');

/**
 * Pluggable Speech-to-Text service. Providers implement transcribe(filePath).
 * Default: local faster-whisper. Add WhisperX later for diarization.
 */
const providers = {
  'faster-whisper': fasterWhisper,
  external,
};

function getProvider(name) {
  return providers[name || config.stt.provider] || fasterWhisper;
}

async function transcribe(filePath, opts = {}) {
  const provider = getProvider(opts.provider);
  return provider.transcribe(filePath, opts);
}

module.exports = { transcribe, getProvider, providerName: config.stt.provider };
