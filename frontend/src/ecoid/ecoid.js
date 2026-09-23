// "Continue with EcoID" — OIDC Authorization Code + PKCE (public client) + EcoID social resolution.
// Same implementation as MediQlaim src/lib/ecoid.js and CPAMind src/ecoid/ecoid.js.
import { ECOID } from './config.js';

export const REDIRECT_PATH = '/auth/ecoid/callback';
const SCOPE = 'openid profile email did territory';
const redirectUri = () => window.location.origin + REDIRECT_PATH;
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const rand = (n = 32) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a.buffer); };
const challengeFrom = async (v) => b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));

export async function startEcoIdLogin(intent = 'login') {
  const verifier = rand(32); const state = rand(16);
  sessionStorage.setItem('ecoid_pkce_verifier', verifier);
  sessionStorage.setItem('ecoid_state', state);
  sessionStorage.setItem('ecoid_intent', intent);
  const qs = new URLSearchParams({ client_id: ECOID.clientId, redirect_uri: redirectUri(), response_type: 'code', scope: SCOPE,
    state, code_challenge: await challengeFrom(verifier), code_challenge_method: 'S256', nonce: rand(8) });
  window.location.assign(`${ECOID.origin}/authorize?${qs.toString()}`);
}

export async function finishEcoIdLogin({ code, state }) {
  const expected = sessionStorage.getItem('ecoid_state'); const verifier = sessionStorage.getItem('ecoid_pkce_verifier');
  sessionStorage.removeItem('ecoid_state'); sessionStorage.removeItem('ecoid_pkce_verifier');
  if (!code) throw new Error('missing_code');
  if (!state || state !== expected) throw new Error('state_mismatch');
  if (!verifier) throw new Error('missing_pkce_verifier');
  const res = await fetch(`${ECOID.origin}/api/v1/oidc/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: ECOID.clientId, redirect_uri: redirectUri(), code_verifier: verifier }).toString() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || 'token_exchange_failed');
  return data;
}

export async function fetchSocialProviders() {
  const res = await fetch(`${ECOID.origin}/api/v1/auth/social/providers`);
  return ((await res.json().catch(() => ({}))).providers) || {};
}

export async function postSocial(provider, body) {
  const res = await fetch(`${ECOID.origin}/api/v1/auth/social/${provider}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data.error || 'social_sign_in_failed');
  return data;
}
