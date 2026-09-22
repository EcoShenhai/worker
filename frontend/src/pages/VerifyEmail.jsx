import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function VerifyEmail() {
  const { verifyEmail, resendCode } = useAuth();
  const { t } = useI18n();
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
        <AuthBrand logo={false} />
        <div className="sub">{t('auth.startAtSignIn')}</div>
        <Link className="btn block" to="/login">{t('auth.goToSignIn')}</Link>
      </div></div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setBusy(true);
    try {
      await verifyEmail(userId, code.trim());
      navigate('/login', { replace: true });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('auth.invalidCode') });
    } finally { setBusy(false); }
  };
  const resend = async () => {
    setMsg(null);
    try { await resendCode(userId, 'verify_email'); setMsg({ type: 'ok', text: t('auth.codeSent') }); }
    catch (e) { setMsg({ type: 'err', text: e.response?.data?.message || t('auth.resendFailed') }); }
  };

  return (
    <div className="auth-wrap"><div className="auth-card">
      <AuthBrand />
      <div className="sub">{email ? t('auth.verifyEmailTo', { email }) : t('auth.verifyEmailTitle')}</div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <form onSubmit={submit}>
        <div className="field"><label>{t('auth.code6')}</label><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000" required /></div>
        <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : t('auth.verify')}</button>
      </form>
      <button className="btn ghost sm block" style={{ marginTop: '0.8rem' }} onClick={resend}>{t('auth.resendCode')}</button>
    </div></div>
  );
}
