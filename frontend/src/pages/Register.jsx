import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import Logo from '../components/Logo.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.password.length < 8) return setErr('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      const r = await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/verify-email', { state: { userId: r.userId, email: r.email } });
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Logo size={40} /><div className="wordmark">Worker</div></div>
        <div className="sub">Create your account</div>
        <Notice type="err">{err}</Notice>
        <form onSubmit={submit}>
          <div className="field"><label>Full name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="username" required /></div>
          <div className="field"><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required /></div>
          <div className="field"><label>Confirm password</label><input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" required /></div>
          <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : 'Create account'}</button>
        </form>
        <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
