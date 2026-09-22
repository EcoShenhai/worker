import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function ChangePassword() {
  const { user, refreshUser, logout } = useAuth();
  const { t } = useI18n();
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
    if (next.length < 10) return setErr(t('auth.newPwMin', { n: 10 }));
    if (next !== confirm) return setErr(t('auth.pwMismatch'));
    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: forced ? undefined : current,
        newPassword: next,
      });
      await refreshUser();
      navigate('/');
    } catch (e) {
      setErr(e.response?.data?.message || t('auth.changeFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}><LanguageSwitcher /></div>
        <div className="wordmark">{t('auth.setNewPassword')}</div>
        <div className="sub">
          {forced ? t('auth.forcedChange') : t('auth.updateAccountPassword')}
        </div>
        <Notice type="err">{err}</Notice>
        <form onSubmit={submit}>
          {!forced && (
            <div className="field">
              <label>{t('auth.currentPassword')}</label>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>{t('auth.newPassword')}</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
          </div>
          <div className="field">
            <label>{t('auth.confirmNewPassword')}</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </div>
          <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : t('auth.updatePassword')}</button>
        </form>
        <button className="btn ghost sm block" style={{ marginTop: '0.8rem' }} onClick={async () => { await logout(); navigate('/login'); }}>
          {t('auth.signOutInstead')}
        </button>
      </div>
    </div>
  );
}
