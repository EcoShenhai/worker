'use strict';
/**
 * EcoID token verification (ECOID_DUAL_AUTHENTICATION_BLUEPRINT §8, §16) — same as CPAMind.
 * ES256 via EcoID JWKS; issuer enforced; aud must be "worker" when present (social tokens carry none).
 * The EcoID `sub` is the global_eco_id federation key — never Worker's users.id.
 */
const { createRemoteJWKSet, jwtVerify } = require('jose');
const axios = require('axios');

const ISSUER = (process.env.ECOID_ISSUER || 'https://ecoid.eshcloud.com').replace(/\/+$/, '');
const JWKS_URI = process.env.ECOID_JWKS_URI || `${ISSUER}/api/v1/oidc/jwks`;
const USERINFO_URI = `${ISSUER}/api/v1/oidc/userinfo`;
const CLIENT_ID = process.env.ECOID_OIDC_CLIENT_ID || 'worker';

let jwks = null;
const getJwks = () => { if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URI)); return jwks; };

async function verifyEcoIdToken(token) {
  if (!token || typeof token !== 'string') throw new Error('missing_token');
  const { payload } = await jwtVerify(token, getJwks(), { issuer: ISSUER, algorithms: ['ES256'] });
  if (payload.aud !== undefined) {
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(CLIENT_ID)) throw new Error('wrong_audience');
  }
  if (!payload.sub) throw new Error('missing_subject');
  return payload;
}

async function fetchUserInfo(token) {
  const { data } = await axios.get(USERINFO_URI, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
  return data || {};
}

module.exports = { verifyEcoIdToken, fetchUserInfo };
