import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import Logo from '../components/Logo.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await login(email.trim(), password);
      if (r.next === 'mfa') {
        navigate('/mfa', { state: { userId: r.userId, email: email.trim() } });
      } else if (r.next === 'verify_email') {
        navigate('/verify-email', { state: { userId: r.userId, email: email.trim() } });
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Sign in failed. Check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Logo size={40} /><div className="wordmark">Worker</div></div>
        <div className="sub">AI administrative workspace</div>
        <Notice type="err">{err}</Notice>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : 'Sign in'}</button>
        </form>
        <div className="between" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/register">Create account</Link>
        </div>
        <p className="muted" style={{ fontSize: '0.78rem', marginTop: '1rem', marginBottom: 0 }}>
          A one-time code is emailed to confirm each sign-in.
        </p>
      </div>
    </div>
  );
}
