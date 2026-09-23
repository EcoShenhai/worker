import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { useI18n } from '../i18n/index.jsx';
import EcoIdButtons from '../components/EcoIdButtons.jsx';

export default function Register() {
  const { register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.password.length < 8) return setErr(t('auth.pwMin', { n: 8 }));
    if (form.password !== form.confirm) return setErr(t('auth.pwMismatch'));
    setBusy(true);
    try {
      const r = await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/verify-email', { state: { userId: r.userId, email: r.email } });
    } catch (e) {
      setErr(e.response?.data?.message || t('auth.createFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <AuthBrand />
        <div className="sub">{t('auth.createYourAccount')}</div>
        <Notice type="err">{err}</Notice>
        <form onSubmit={submit}>
          <div className="field"><label>{t('auth.fullName')}</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="field"><label>{t('auth.email')}</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="username" required /></div>
          <div className="field"><label>{t('auth.password')}</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required /></div>
          <div className="field"><label>{t('auth.confirmPassword')}</label><input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" required /></div>
          <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : t('common.createAccount')}</button>
        </form>
        <EcoIdButtons />
        <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          {t('auth.haveAccount')} <Link to="/login">{t('common.signIn')}</Link>
        </div>
      </div>
    </div>
  );
}
