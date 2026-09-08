'use strict';
const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');
const ApiError = require('../../utils/apiError');

/**
 * DeepSeek is OpenAI-compatible. We call the raw HTTP API with axios to avoid
 * pulling the OpenAI SDK. This module is the ONLY place that knows about
 * DeepSeek — swap it for another provider without touching callers.
 */
const client = axios.create({
  baseURL: config.ai.deepseek.baseUrl,
  timeout: config.ai.deepseek.timeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

async function chat({ system, user, json = false, model, temperature = 0.3, maxTokens }) {
  if (!config.ai.deepseek.apiKey) {
    throw ApiError.internal('DEEPSEEK_API_KEY is not configured');
  }
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  const body = {
    model: model || config.ai.deepseek.model,
    messages,
    temperature,
    stream: false,
  };
  if (maxTokens) body.max_tokens = maxTokens;
  if (json) body.response_format = { type: 'json_object' };

  try {
    const { data } = await client.post('/chat/completions', body, {
      headers: { Authorization: `Bearer ${config.ai.deepseek.apiKey}` },
    });
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';
    return { content, usage: data.usage || null };
  } catch (e) {
    const status = e.response ? e.response.status : 'network';
    logger.error('DeepSeek call failed', { status, message: e.message });
    throw ApiError.internal(`AI provider error (${status})`);
  }
}

module.exports = { name: 'deepseek', chat };
