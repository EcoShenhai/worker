import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
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
      setErr(e.response?.data?.message || t('auth.signInFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <AuthBrand />
        <div className="sub">{t('brand.tagline')}</div>
        <Notice type="err">{err}</Notice>
        <form onSubmit={submit}>
          <div className="field">
            <label>{t('auth.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div className="field">
            <label>{t('auth.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : t('common.signIn')}</button>
        </form>
        <div className="between" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
          <Link to="/register">{t('common.createAccount')}</Link>
        </div>
        <p className="muted" style={{ fontSize: '0.78rem', marginTop: '1rem', marginBottom: 0 }}>
          {t('auth.mfaNotice')}
        </p>
      </div>
    </div>
  );
}
