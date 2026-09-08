import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';

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
      const user = await login(email.trim(), password);
      navigate(user.requiresPasswordChange ? '/change-password' : '/');
    } catch (e) {
      setErr(e.response?.data?.message || 'Sign in failed. Check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="wordmark">Worker</div>
        <div className="sub">Office of the President — Provincial Administration</div>
        <Notice type="err">{err}</Notice>
        <form onSubmit={submit}>
          <div className="field">
            <label>Official email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="btn block" disabled={busy}>
            {busy ? <span className="spinner" /> : 'Sign in'}
          </button>
        </form>
        <p className="muted" style={{ fontSize: '0.78rem', marginTop: '1.2rem', marginBottom: 0 }}>
          Authorised users only. All activity is recorded in the audit trail.
        </p>
      </div>
    </div>
  );
}
