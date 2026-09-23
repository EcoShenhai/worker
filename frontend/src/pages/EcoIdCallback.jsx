import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { finishEcoIdLogin } from '../ecoid/ecoid.js';
import { completeEcoId, errMsg } from '../ecoid/completeSignIn.js';

export default function EcoIdCallback() {
  const navigate = useNavigate(); const { setUser } = useAuth();
  const [error, setError] = useState(''); const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; ran.current = true;
    const p = new URLSearchParams(window.location.search);
    const intent = sessionStorage.getItem('ecoid_intent') || 'login'; sessionStorage.removeItem('ecoid_intent');
    if (p.get('error')) { setError(p.get('error_description') || p.get('error')); return; }
    (async () => {
      try {
        const t = await finishEcoIdLogin({ code: p.get('code'), state: p.get('state') });
        await completeEcoId(t.access_token, { intent, setUser, navigate });
      } catch (e) {
        const m = e?.message;
        setError(m === 'state_mismatch' || m === 'missing_pkce_verifier' ? 'This sign-in link has expired. Please start again.' : errMsg(e));
      }
    })();
  }, [setUser, navigate]);
  return (
    <div className="auth-wrap"><div className="auth-card">
      <AuthBrand />
      {error ? (<>
        <div className="sub">Sign-in did not complete</div>
        <div className="notice err">{error}</div>
        <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}><Link to="/login">Back to sign in</Link></div>
      </>) : (<><div className="sub">Signing you in with EcoID…</div><span className="spinner" /></>)}
    </div></div>
  );
}
