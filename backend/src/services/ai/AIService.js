'use strict';
const config = require('../../config');
const deepseek = require('./deepseekProvider');

/**
 * AIService is the stable interface the rest of the app uses. DeepSeek API
 * calls never appear in controllers — they go through here so the provider
 * can be replaced (or a sovereign/local model substituted) later.
 */

const providers = { deepseek };
const provider = providers[config.ai.provider] || deepseek;

const GOV_SYSTEM = [
  'You are Worker, an AI administrative assistant for the Office of the President,',
  'Provincial Administration Department, Kenya. You produce formal, accurate,',
  'well-structured Kenyan government correspondence and records in English.',
  'Be precise with names, figures, dates, places, titles and decisions.',
  'Never invent facts that are not supported by the provided material.',
  'When information is missing, leave a clearly marked placeholder such as',
  '"[TO BE CONFIRMED]" instead of guessing.',
].join(' ');

function parseJson(content) {
  // Providers occasionally wrap JSON in code fences despite json mode.
  const cleaned = String(content || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function generate(prompt, { system, temperature, maxTokens, model } = {}) {
  const { content, usage } = await provider.chat({
    system: system || GOV_SYSTEM,
    user: prompt,
    temperature,
    maxTokens,
    model,
  });
  return { text: content, usage };
}

async function generateJson(prompt, { system, temperature = 0.1, model } = {}) {
  const { content, usage } = await provider.chat({
    system: system || GOV_SYSTEM,
    user: prompt,
    json: true,
    temperature,
    model,
  });
  return { data: parseJson(content), usage };
}

async function summarize(text, instruction = 'Summarize the following for a senior officer.') {
  return generate(`${instruction}\n\n---\n${text}`);
}

async function draft(kind, brief) {
  return generate(`Draft a formal government ${kind} based on the following brief.\n\n---\n${brief}`);
}

async function classify(text, labels) {
  const { data } = await generateJson(
    `Classify the text into exactly one of these labels: ${labels.join(', ')}.\n` +
      `Return JSON {"label": "<one label>", "confidence": <0-1>}.\n\n---\n${text}`
  );
  return data;
}

async function extract(text, schemaDescription) {
  const { data } = await generateJson(
    `Extract structured data from the text. ${schemaDescription}\n\n---\n${text}`
  );
  return data;
}

async function analyze(text, question) {
  return generate(`Answer the question using only the material provided.\n\nQuestion: ${question}\n\n---\n${text}`);
}

module.exports = {
  providerName: provider.name,
  GOV_SYSTEM,
  generate,
  generateJson,
  summarize,
  draft,
  classify,
  extract,
  analyze,
};
