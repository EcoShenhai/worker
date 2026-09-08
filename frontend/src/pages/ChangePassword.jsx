import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';

export default function ChangePassword() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const forced = user?.requiresPasswordChange;

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (next.length < 10) return setErr('New password must be at least 10 characters.');
    if (next !== confirm) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: forced ? undefined : current,
        newPassword: next,
      });
      await refreshUser();
      navigate('/');
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not change password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="wordmark">Set a new password</div>
        <div className="sub">
          {forced ? 'For security, set your own password before continuing.' : 'Update your account password.'}
        </div>
        <Notice type="err">{err}</Notice>
        <form onSubmit={submit}>
          {!forced && (
            <div className="field">
              <label>Current password</label>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>New password</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </div>
          <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : 'Update password'}</button>
        </form>
        <button className="btn ghost sm block" style={{ marginTop: '0.8rem' }} onClick={async () => { await logout(); navigate('/login'); }}>
          Sign out instead
        </button>
      </div>
    </div>
  );
}
