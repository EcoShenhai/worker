import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const { t } = useI18n();
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
    if (pw.length < 8) return setMsg({ type: 'err', text: t('auth.pwMin', { n: 8 }) });
    if (pw !== confirm) return setMsg({ type: 'err', text: t('auth.pwMismatch') });
    setBusy(true);
    try {
      await resetPassword(email.trim(), code.trim(), pw);
      navigate('/login', { replace: true });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('auth.invalidCode') });
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap"><div className="auth-card">
      <AuthBrand />
      <div className="sub">{t('auth.resetPrompt')}</div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <form onSubmit={submit}>
        <div className="field"><label>{t('auth.email')}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label>{t('auth.code6')}</label><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000" required /></div>
        <div className="field"><label>{t('auth.newPassword')}</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required /></div>
        <div className="field"><label>{t('auth.confirmNewPassword')}</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></div>
        <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : t('auth.resetPassword')}</button>
      </form>
      <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}><Link to="/login">{t('auth.backToSignIn')}</Link></div>
    </div></div>
  );
}
