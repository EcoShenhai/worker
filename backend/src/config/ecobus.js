'use strict';
/**
 * EcoBus integration for Worker (dual support) — same as CPAMind/MediQlaim with the Dual Support fixes:
 * handlers wired at subscribe() time; only ecobus-support consumed, replayed from the start (idempotent writes);
 * events signed with an EcoID-issued identity (worker-svc), falling back to a local key.
 */
const { generateKeyPair, exportJWK } = require('jose');
const { EcoBusProducer, EcoBusConsumer } = require('@theshenhai/ecobus-client');
const logger = require('../utils/logger');

const APP_DID = process.env.ECOBUS_APP_DID || 'did:ecoid:global:app:WORKER';
const TERRITORY = 'KE';
const ISSUER = (process.env.ECOID_ISSUER || 'https://ecoid.eshcloud.com').replace(/\/+$/, '');
const redisOpts = () => ({ redisHost: process.env.REDIS_HOST || '127.0.0.1', redisPort: process.env.REDIS_PORT || 6379, redisPassword: process.env.REDIS_PASSWORD || undefined });

let producer = null; let consumer = null; let identity = null; let started = false; let published = 0;
const deadLetters = [];
const deadLetter = (d) => { deadLetters.push({ ...d, at: new Date().toISOString() }); if (deadLetters.length > 100) deadLetters.shift(); };

async function getIdentity() {
  if (identity) return identity;
  try {
    const { issueAgentIdentity } = require('@theshenhai/ecoid-sdk');
    identity = await issueAgentIdentity(APP_DID, { issuer: ISSUER, clientId: process.env.ECOBUS_CLIENT_ID, clientSecret: process.env.ECOBUS_CLIENT_SECRET });
    identity.fallback = false;
  } catch (err) {
    logger.warn(`[ecobus] EcoID identity issuance failed, using local fallback key: ${err.message}`);
    const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
    identity = { did: APP_DID, publicJwk: { ...(await exportJWK(publicKey)), kid: `${APP_DID}#keys-1`, alg: 'ES256' }, privateJwk: await exportJWK(privateKey), fallback: true };
  }
  return identity;
}

async function getProducer() {
  if (producer) return producer;
  const id = await getIdentity();
  const p = new EcoBusProducer({ did: id.did, signingKey: id.privateJwk, ...redisOpts(), type: 'app', territory: TERRITORY,
    topicResolver: (t) => (t.startsWith('SUPPORT_') ? 'ecobus-support' : 'ecobus-general') });
  await p.connect(); producer = p; return producer;
}

async function publish(eventType, payload, { partitionKey } = {}) {
  const p = await getProducer();
  try { const r = await p.publish(eventType, payload, partitionKey); published++; return r && r.event_id; }
  catch (err) { deadLetter({ eventType, reason: 'publish_failed', error: err.message }); throw err; }
}

function ensureConsumer() {
  if (!consumer) consumer = new EcoBusConsumer({ groupId: `worker-${TERRITORY}`, ...redisOpts() });
  return consumer;
}

function subscribe(eventType, handler) {
  ensureConsumer().on(eventType, async (envelope) => {
    try { await handler((envelope && envelope.payload) || {}, envelope); }
    catch (err) { deadLetter({ eventType, reason: 'handler_error', error: err.message }); logger.error(`[ecobus] ${eventType} handler error: ${err.message}`); }
  });
}

async function start() {
  if (started) return;
  await ensureConsumer().subscribe(['ecobus-support'], { fromByTopic: { 'ecobus-support': '0' } });
  started = true;
  logger.info('[ecobus] consumer started: ecobus-support (replay from start; idempotent writes)');
}

const stats = () => ({ started, published, deadLetters: deadLetters.length, lastDeadLetter: deadLetters[deadLetters.length - 1] || null, identityFallback: identity ? identity.fallback : null });
module.exports = { publish, subscribe, start, stats };
