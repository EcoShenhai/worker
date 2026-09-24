'use strict';

// Worker speech-to-text coverage for the Shenhai B2X language registry.
// stt = Whisper language code; null = transcription unavailable (AI drafting in the language still works).
const REMAP = { fil: 'tl', cnr: 'sr' }; // Filipino -> Tagalog, Montenegrin -> Serbian (mutually intelligible)
const UNSUPPORTED = new Set(['dv', 'kl', 'ga', 'ky', 'tet']);
// Dependable on the current light model; every other supported language is labelled beta.
const STANDARD = new Set(['en', 'fr', 'es', 'pt', 'de', 'it', 'nl', 'ru', 'zh', 'ja', 'ko', 'pl', 'tr', 'sv', 'ca', 'id', 'uk', 'cs', 'ro', 'vi', 'ar']);

function sttFor(code) {
  if (UNSUPPORTED.has(code)) return { stt: null, sttTier: 'unavailable' };
  return { stt: REMAP[code] || code, sttTier: STANDARD.has(code) ? 'standard' : 'beta' };
}

module.exports = { sttFor, REMAP, UNSUPPORTED, STANDARD };
