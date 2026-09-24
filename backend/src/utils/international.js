'use strict';

// Territory & language helpers: validation, defaults and STT language resolution.
// Wording rule: "territory", never "country".
const { TERRITORY_CODES, LANGUAGE_CODES, TERRITORY_OPTIONS, LANGUAGE_OPTIONS } = require('../config/international');
const ApiError = require('./apiError');

function normTerritory(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw ApiError.badRequest('Please select your territory.');
    return null;
  }
  const code = String(value).trim().toUpperCase();
  if (!TERRITORY_CODES.has(code)) throw ApiError.badRequest('Unknown territory.');
  return code;
}

function normLanguage(value) {
  if (value === undefined || value === null || value === '') return null;
  const code = String(value).trim().toLowerCase();
  if (!LANGUAGE_CODES.has(code)) throw ApiError.badRequest('Unsupported language.');
  return code;
}

function defaultLanguageFor(territory) {
  const t = TERRITORY_OPTIONS.find((x) => x.code === territory);
  return (t && t.languages[0]) || 'en';
}

function languageOption(code) {
  return LANGUAGE_OPTIONS.find((l) => l.code === code) || null;
}

// Recording language = session language, else tenant default, else English.
async function resolveSttLanguage(recording) {
  const { WorkspaceSession, Tenant } = require('../models');
  const session = recording.sessionId
    ? await WorkspaceSession.findByPk(recording.sessionId, { attributes: ['id', 'tenantId', 'language'] })
    : null;
  const tenantId = (session && session.tenantId) || recording.tenantId || null;
  const tenant = tenantId ? await Tenant.findByPk(tenantId, { attributes: ['id', 'defaultLanguage'] }) : null;
  const code = (session && session.language) || (tenant && tenant.defaultLanguage) || 'en';
  const opt = languageOption(code);
  const label = opt ? opt.native : code;
  if (!opt || !opt.stt) {
    throw ApiError.badRequest(`Transcription is not yet available for ${label}. Choose another recording language for this session; documents can still be drafted in ${label}.`);
  }
  const model = process.env.STT_MODEL || '';
  if (model.endsWith('.en') && opt.stt !== 'en') {
    throw ApiError.badRequest('Multilingual transcription is not enabled yet. Please record in English for now.');
  }
  return opt.stt;
}

module.exports = { normTerritory, normLanguage, defaultLanguageFor, languageOption, resolveSttLanguage };
