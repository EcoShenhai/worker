import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import api, { setToken } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { ECOID_PENDING_KEY, errMsg } from '../ecoid/completeSignIn.js';

// First Worker sign-in for a verified EcoID identity: creates a new workspace with you as its admin
// (same as self-registration). Email comes from EcoID on the server.
export default function EcoIdRegister() {
  const navigate = useNavigate(); const location = useLocation(); const { setUser } = useAuth();
  const token = sessionStorage.getItem(ECOID_PENDING_KEY);
  const email = location.state?.email || '';
  const [name, setName] = useState(location.state?.name || '');
  const [workspaceName, setWorkspaceName] = useState('');
  const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  if (!token) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const { data } = await api.post('/auth/ecoid/register', { ecoidToken: token, name: name.trim(), workspaceName: workspaceName.trim() });
      sessionStorage.removeItem(ECOID_PENDING_KEY);
      setToken(data.accessToken); setUser(data.user);
      navigate('/', { replace: true });
    } catch (e2) {
      const code = e2?.response?.data?.code; const status = e2?.response?.status;
      if (status === 401) { sessionStorage.removeItem(ECOID_PENDING_KEY); setErr({ text: 'Your EcoID session expired. Please sign in again.', login: true }); }
      else setErr({ text: errMsg(e2, 'Could not create your account.'), login: code === 'EMAIL_EXISTS' || code === 'ALREADY_REGISTERED' });
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap"><div className="auth-card">
      <AuthBrand />
      <div className="sub">Finish creating your Worker account</div>
      {email && <p className="muted" style={{ fontSize: '0.85rem' }}>Signing up as <strong>{email}</strong> with EcoID.</p>}
      {err && <div className="notice err">{err.text}{err.login && <> <Link to="/login">Go to sign in</Link></>}</div>}
      <form onSubmit={submit}>
        <div className="field"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field"><label>Workspace name</label><input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder={name ? `${name} (Workspace)` : 'e.g. Acme Ltd'} /></div>
        <p className="muted" style={{ fontSize: '0.78rem' }}>You'll be the admin of a new workspace and can invite colleagues later.</p>
        <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : 'Create account'}</button>
      </form>
      <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Already have a Worker account? <Link to="/login">Sign in</Link>, then link EcoID from your account.</div>
    </div></div>
  );
}
