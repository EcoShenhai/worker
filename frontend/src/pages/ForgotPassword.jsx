import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import Logo from '../components/Logo.jsx';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
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
      setMsg({ type: 'err', text: e.response?.data?.message || 'Could not process request.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap"><div className="auth-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Logo size={40} /><div className="wordmark">Worker</div></div>
      <div className="sub">Reset your password</div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <form onSubmit={submit}>
        <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : 'Send reset code'}</button>
      </form>
      <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}><Link to="/login">Back to sign in</Link></div>
    </div></div>
  );
}
