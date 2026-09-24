'use strict';

// Tenant-aware system prompt: organisation name, territory conventions and working language.
// Replaces the former hard-coded single-office identity. Wording rule: "territory", never "country".
const { TERRITORY_OPTIONS, LANGUAGE_OPTIONS } = require('../../config/international');
const { currentUser } = require('../../utils/requestContext');

const RULES = [
  'Be precise with names, figures, dates, places, titles and decisions.',
  'Never invent facts that are not supported by the provided material.',
  'When information is missing, leave a clearly marked placeholder such as',
  '"[TO BE CONFIRMED]" instead of guessing.',
];

const TTL_MS = 60 * 1000;
const cache = new Map();

function displayOrgName(name) {
  return String(name || '').trim().replace(/\s*\(Workspace\)$/i, '');
}

function buildSystemPrompt(tenant) {
  const territory = tenant && tenant.territory ? TERRITORY_OPTIONS.find((x) => x.code === tenant.territory) : null;
  const language = LANGUAGE_OPTIONS.find((x) => x.code === ((tenant && tenant.defaultLanguage) || 'en'));
  const org = tenant ? displayOrgName(tenant.name) : '';
  const where = territory ? `, operating in ${territory.name}` : '';
  return [
    org
      ? `You are Worker, an AI administrative assistant for ${org}${where}.`
      : `You are Worker, an AI administrative assistant${territory ? ` for an organisation operating in ${territory.name}` : ''}.`,
    'You produce formal, accurate, well-structured official correspondence and records.',
    territory
      ? `Follow the formal conventions for official documents used in ${territory.name}.`
      : 'Follow widely accepted formal conventions for official documents.',
    `Write in ${language ? language.name : 'English'} unless the instruction explicitly asks for another language.`,
    ...RULES,
  ].join(' ');
}

async function systemPromptForCurrentRequest() {
  const user = currentUser();
  const tenantId = user && user.tenantId;
  if (!tenantId) return buildSystemPrompt(null);
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.prompt;
  const { Tenant } = require('../../models');
  const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'name', 'territory', 'defaultLanguage'] });
  const prompt = buildSystemPrompt(tenant);
  cache.set(tenantId, { prompt, at: Date.now() });
  return prompt;
}

module.exports = { buildSystemPrompt, systemPromptForCurrentRequest, displayOrgName };
