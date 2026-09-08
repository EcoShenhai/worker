import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import Logo from '../components/Logo.jsx';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState(loc.state?.email || '');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) return setMsg({ type: 'err', text: 'Password must be at least 8 characters.' });
    if (pw !== confirm) return setMsg({ type: 'err', text: 'Passwords do not match.' });
    setBusy(true);
    try {
      await resetPassword(email.trim(), code.trim(), pw);
      navigate('/login', { replace: true });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Invalid or expired code.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap"><div className="auth-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Logo size={40} /><div className="wordmark">Worker</div></div>
      <div className="sub">Enter the code we emailed and choose a new password</div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <form onSubmit={submit}>
        <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label>6-digit code</label><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000" required /></div>
        <div className="field"><label>New password</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required /></div>
        <div className="field"><label>Confirm new password</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></div>
        <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : 'Reset password'}</button>
      </form>
      <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}><Link to="/login">Back to sign in</Link></div>
    </div></div>
  );
}
