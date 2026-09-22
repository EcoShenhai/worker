import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setBusy(true);
    try {
      await forgotPassword(email.trim());
      navigate('/reset-password', { state: { email: email.trim() } });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('auth.requestFailed') });
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap"><div className="auth-card">
      <AuthBrand />
      <div className="sub">{t('auth.resetTitle')}</div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <form onSubmit={submit}>
        <div className="field"><label>{t('auth.email')}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : t('auth.sendResetCode')}</button>
      </form>
      <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}><Link to="/login">{t('auth.backToSignIn')}</Link></div>
    </div></div>
  );
}
