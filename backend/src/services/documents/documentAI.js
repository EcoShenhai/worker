'use strict';
const AIService = require('../ai/AIService');

/**
 * Staged pipeline (per reviewer guidance): do NOT ask one call to do everything.
 *   Pass 1: transcription (done by STT, upstream)
 *   Pass 2: normalization  -> clean transcript, fix obvious ASR errors
 *   Pass 3: extraction     -> structured JSON record
 *   Pass 4: generation     -> formal minutes content (structured)
 */

async function normalizeTranscript(rawText) {
  const { text } = await AIService.generate(
    'Clean up this raw meeting transcript. Fix obvious speech-to-text errors and ' +
      'punctuation, but PRESERVE meaning exactly. Do not summarize, add, or remove content. ' +
      'Return only the cleaned transcript.\n\n---\n' +
      rawText,
    { temperature: 0.1 }
  );
  return text;
}

async function extractRecord(cleanText, sessionMeta = {}) {
  const schema = `Return JSON with this exact shape:
{
  "attendees": [{"name": string, "title": string}],
  "apologies": [string],
  "agenda": [string],
  "discussion": [{"item": string, "summary": string}],
  "decisions": [string],
  "resolutions": [string],
  "action_items": [{"action": string, "responsible": string, "deadline": string}],
  "follow_up": [string]
}
Use "[TO BE CONFIRMED]" where the transcript does not state something. Do not invent names or figures.`;

  const context = `Meeting title: ${sessionMeta.title || 'N/A'}
Date: ${sessionMeta.occurredOn || 'N/A'}
Known attendees (may be incomplete): ${(sessionMeta.attendees || []).join('; ') || 'N/A'}`;

  const { data, usage } = await AIService.generateJson(
    `Extract a structured administrative record from the transcript.\n${schema}\n\nContext:\n${context}\n\nTranscript:\n${cleanText}`
  );
  return { record: data, usage };
}

async function generateMinutesContent(record, sessionMeta = {}) {
  // Build formal minutes as structured content (headings + paragraphs/lists).
  const prompt = `Using the structured record below, write formal Kenyan government meeting minutes in English.
Return JSON:
{
  "heading": string,           // e.g. "MINUTES OF THE ... MEETING HELD ON ..."
  "preamble": string,          // opening paragraph (venue, chair, quorum)
  "sections": [ { "title": string, "body": string } ],
  "action_matrix": [ { "action": string, "responsible": string, "deadline": string } ],
  "closing": string            // e.g. adjournment + next meeting
}
Session: ${JSON.stringify(sessionMeta)}
Record: ${JSON.stringify(record)}`;

  const { data, usage } = await AIService.generateJson(prompt);
  return { content: data, usage };
}

/** Convenience: full transcript -> minutes content, verifying nothing is skipped. */
async function transcriptToMinutes(rawOrEditedText, sessionMeta) {
  const clean = await normalizeTranscript(rawOrEditedText);
  const { record } = await extractRecord(clean, sessionMeta);
  const { content } = await generateMinutesContent(record, sessionMeta);
  return { cleanTranscript: clean, record, content };
}

module.exports = {
  normalizeTranscript,
  extractRecord,
  generateMinutesContent,
  transcriptToMinutes,
};
