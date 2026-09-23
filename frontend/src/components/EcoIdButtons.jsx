import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ECOID } from '../ecoid/config.js';
import { startEcoIdLogin, fetchSocialProviders, postSocial } from '../ecoid/ecoid.js';
import { completeEcoId, errMsg } from '../ecoid/completeSignIn.js';

const loadScript = (src, id) => new Promise((resolve, reject) => {
  if (document.getElementById(id)) return resolve();
  const s = document.createElement('script'); s.src = src; s.id = id; s.async = true; s.defer = true;
  s.onload = () => resolve(); s.onerror = reject; document.body.appendChild(s);
});

// intent: "login" (sign in / sign up) or "link" (attach EcoID to the signed-in account)
export default function EcoIdButtons({ intent = 'login' }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [enabled, setEnabled] = useState({ google: false, facebook: false, telegram: false });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const googleRef = useRef(null); const telegramRef = useRef(null);

  const succeed = useCallback(async (token) => {
    setError('');
    try { await completeEcoId(token, { intent, setUser, navigate }); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(''); }
  }, [intent, setUser, navigate]);
  const fromSocial = useCallback(async (provider, body) => {
    setBusy(provider); setError('');
    try { const d = await postSocial(provider, body); await succeed(d.access_token); }
    catch (e) { setError(errMsg(e)); setBusy(''); }
  }, [succeed]);

  useEffect(() => {
    if (!ECOID.googleClientId && !ECOID.facebookAppId && !ECOID.telegramBot) return undefined;
    let alive = true;
    fetchSocialProviders().then((p) => { if (alive) setEnabled({
      google: !!(p.google && ECOID.googleClientId), facebook: !!(p.facebook && ECOID.facebookAppId), telegram: !!(p.telegram && ECOID.telegramBot) }); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!enabled.google) return undefined; let cancelled = false;
    loadScript('https://accounts.google.com/gsi/client', 'gsi-client').then(() => {
      if (cancelled || !window.google || !googleRef.current) return;
      window.google.accounts.id.initialize({ client_id: ECOID.googleClientId, callback: (r) => fromSocial('google', { id_token: r.credential }) });
      window.google.accounts.id.renderButton(googleRef.current, { theme: 'outline', size: 'large', text: 'continue_with', width: 300 });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [enabled.google, fromSocial]);
  useEffect(() => {
    if (!enabled.facebook) return;
    loadScript('https://connect.facebook.net/en_US/sdk.js', 'fb-sdk').then(() => { if (window.FB) window.FB.init({ appId: ECOID.facebookAppId, version: 'v19.0', cookie: false, xfbml: false }); }).catch(() => {});
  }, [enabled.facebook]);
  const facebookLogin = () => {
    if (!window.FB) return; setBusy('facebook');
    window.FB.login((r) => { const at = r?.authResponse?.accessToken; if (at) fromSocial('facebook', { access_token: at }); else setBusy(''); }, { scope: 'email,public_profile' });
  };
  useEffect(() => {
    if (!enabled.telegram || !telegramRef.current) return;
    window.onWorkerTelegramAuth = (user) => fromSocial('telegram', user);
    telegramRef.current.innerHTML = '';
    const s = document.createElement('script'); s.src = 'https://telegram.org/js/telegram-widget.js?22'; s.async = true;
    s.setAttribute('data-telegram-login', ECOID.telegramBot); s.setAttribute('data-size', 'large');
    s.setAttribute('data-onauth', 'onWorkerTelegramAuth(user)'); s.setAttribute('data-request-access', 'write');
    telegramRef.current.appendChild(s);
  }, [enabled.telegram, fromSocial]);

  const startEcoId = async () => {
    setBusy('ecoid'); setError('');
    try { await startEcoIdLogin(intent); } catch { setError('Could not start EcoID sign-in. Please try again.'); setBusy(''); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: '1rem' }}>
      {intent === 'login' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', opacity: 0.7 }}>
          <span style={{ flex: 1, borderTop: '1px solid currentColor', opacity: 0.3 }} />or<span style={{ flex: 1, borderTop: '1px solid currentColor', opacity: 0.3 }} />
        </div>
      )}
      {error && <div className="notice err" style={{ fontSize: '0.85rem' }}>{error}</div>}
      <button type="button" className="btn block" onClick={startEcoId} disabled={!!busy}>
        {busy === 'ecoid' ? 'Redirecting to EcoID…' : 'Continue with EcoID'}
      </button>
      {enabled.google && <div ref={googleRef} style={{ display: 'flex', justifyContent: 'center' }} />}
      {enabled.facebook && <button type="button" className="btn block" onClick={facebookLogin} disabled={!!busy}>{busy === 'facebook' ? 'Connecting…' : 'Continue with Facebook'}</button>}
      {enabled.telegram && <div ref={telegramRef} style={{ display: 'flex', justifyContent: 'center' }} />}
    </div>
  );
}
