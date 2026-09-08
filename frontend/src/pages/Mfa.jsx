import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import Logo from '../components/Logo.jsx';

export default function Mfa() {
  const { verifyMfa, resendCode } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const userId = loc.state?.userId;
  const email = loc.state?.email;
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!userId) {
    return (
      <div className="auth-wrap"><div className="auth-card">
        <div className="wordmark">Worker</div>
        <div className="sub">Please sign in again.</div>
        <Link className="btn block" to="/login">Go to sign in</Link>
      </div></div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setBusy(true);
    try {
      const user = await verifyMfa(userId, code.trim());
      navigate(user.requiresPasswordChange ? '/change-password' : '/', { replace: true });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Invalid or expired code.' });
    } finally { setBusy(false); }
  };
  const resend = async () => {
    setMsg(null);
    try { await resendCode(userId, 'login'); setMsg({ type: 'ok', text: 'A new code has been sent.' }); }
    catch (e) { setMsg({ type: 'err', text: e.response?.data?.message || 'Could not resend.' }); }
  };

  return (
    <div className="auth-wrap"><div className="auth-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Logo size={40} /><div className="wordmark">Worker</div></div>
      <div className="sub">Enter the sign-in code we emailed{email ? ' to ' + email : ''}</div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <form onSubmit={submit}>
        <div className="field"><label>6-digit code</label><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000" required /></div>
        <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : 'Verify & sign in'}</button>
      </form>
      <button className="btn ghost sm block" style={{ marginTop: '0.8rem' }} onClick={resend}>Resend code</button>
    </div></div>
  );
}
