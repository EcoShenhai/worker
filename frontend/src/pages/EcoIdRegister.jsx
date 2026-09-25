import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import api, { setToken, setSession } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { ECOID_PENDING_KEY, errMsg } from '../ecoid/completeSignIn.js';
import { useI18n } from '../i18n/index.jsx';
import { useInternational, guessTerritory } from '../hooks/useInternational.js';
import { TerritorySelect, LanguageSelect } from '../components/InternationalSelects.jsx';

// First Worker sign-in for a verified EcoID identity: creates a new workspace with you as its admin
// (same as self-registration). Email comes from EcoID on the server.
export default function EcoIdRegister() {
  const navigate = useNavigate(); const location = useLocation(); const { setUser } = useAuth();
  const token = sessionStorage.getItem(ECOID_PENDING_KEY);
  const email = location.state?.email || '';
  const [name, setName] = useState(location.state?.name || '');
  const [workspaceName, setWorkspaceName] = useState('');
  const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  const { data: intl } = useInternational();
  const [territory, setTerritoryState] = useState('');
  const [language, setLanguage] = useState('');
  const defaultLangFor = (code) => intl?.territories.find((x) => x.code === code)?.languages[0] || 'en';
  useEffect(() => {
    if (!intl || territory) return;
    const g = guessTerritory(new Set(intl.territories.map((x) => x.code)));
    if (g) { setTerritoryState(g); setLanguage(defaultLangFor(g)); }
  }, [intl]); // eslint-disable-line react-hooks/exhaustive-deps
  const setTerritory = (code) => { setTerritoryState(code); setLanguage(defaultLangFor(code)); };
  if (!token) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault(); setErr(null);
    if (intl && !territory) return setErr({ text: t('intl.territoryRequired') });
    setBusy(true);
    try {
      const { data } = await api.post('/auth/ecoid/register', { ecoidToken: token, name: name.trim(), workspaceName: workspaceName.trim(), territory: territory || undefined, language: language || undefined });
      sessionStorage.removeItem(ECOID_PENDING_KEY);
      setSession(data); setUser(data.user);
      navigate('/', { replace: true });
    } catch (e2) {
      const code = e2?.response?.data?.code; const status = e2?.response?.status;
      if (status === 401) { sessionStorage.removeItem(ECOID_PENDING_KEY); setErr({ text: t('ecoidReg.expired'), login: true }); }
      else if (code === 'EMAIL_EXISTS') { window.location.replace('/auth/ecoid/connect'); } else setErr({ text: errMsg(e2, t('ecoidReg.createFailed')), login: code === 'EMAIL_EXISTS' || code === 'ALREADY_REGISTERED' });
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap"><div className="auth-card">
      <AuthBrand />
      <div className="sub">{t('ecoidReg.finish')}</div>
      {email && <p className="muted" style={{ fontSize: '0.85rem' }}>{t('ecoidReg.signingUpAs')} <strong>{email}</strong></p>}
      {err && <div className="notice err">{err.text}{err.login && <> <Link to="/login">{t('ecoidReg.goToSignIn')}</Link></>}</div>}
      <form onSubmit={submit}>
        <div className="field"><label>{t('auth.fullName')}</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field"><label>{t('ecoidReg.workspaceName')}</label><input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder={name ? `${name} (Workspace)` : t('ecoidReg.workspaceExample')} /></div>
        {intl && (
          <>
            <div className="field"><label>{t('intl.territory')}</label><TerritorySelect territories={intl.territories} value={territory} onChange={setTerritory} required searchPlaceholder={t('intl.searchTerritory')} placeholder={t('intl.selectTerritory')} /></div>
            {territory && <div className="field"><label>{t('intl.workingLanguage')}</label><LanguageSelect languages={intl.languages} preferred={intl.territories.find((x) => x.code === territory)?.languages} value={language} onChange={setLanguage} /></div>}
          </>
        )}
        <p className="muted" style={{ fontSize: '0.78rem' }}>{t('ecoidReg.adminNote')}</p>
        <button className="btn block" disabled={busy}>{busy ? <span className="spinner" /> : t('common.createAccount')}</button>
      </form>
      <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{t('ecoidReg.haveAccount')} <Link to="/login">{t('common.signIn')}</Link> — {t('ecoidReg.thenLink')}</div>
    </div></div>
  );
}
