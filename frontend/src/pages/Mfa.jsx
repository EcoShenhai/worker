import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function Mfa() {
  const { verifyMfa, resendCode } = useAuth();
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
        <div className="sub">{t('auth.signInAgain')}</div>
        <Link className="btn block" to="/login">{t('auth.goToSignIn')}</Link>
      </div></div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setBusy(true);
    try {
      const user = await verifyMfa(userId, code.trim());
      navigate(user.requiresPasswordChange ? '/change-password' : '/', { replace: true });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('auth.invalidCode') });
    } finally { setBusy(false); }
  };
  const resend = async () => {
    setMsg(null);
    try { await resendCode(userId, 'login'); setMsg({ type: 'ok', text: t('auth.codeSent') }); }
    catch (e) { setMsg({ type: 'err', text: e.response?.data?.message || t('auth.resendFailed') }); }
  };

  return (
    <div className="auth-wrap"><div className="auth-card">
      <AuthBrand />
      <div className="sub">{email ? t('auth.mfaPromptTo', { email }) : t('auth.mfaPrompt')}</div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <form onSubmit={submit}>
        <div className="field"><label>{t('auth.code6')}</label><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000" required /></div>
        <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : t('auth.verifySignIn')}</button>
      </form>
      <button className="btn ghost sm block" style={{ marginTop: '0.8rem' }} onClick={resend}>{t('auth.resendCode')}</button>
    </div></div>
  );
}
