import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice } from '../components/ui.jsx';
import AuthBrand from '../components/AuthBrand.jsx';
import { useI18n } from '../i18n/index.jsx';
import EcoIdButtons from '../components/EcoIdButtons.jsx';
import { useInternational, guessTerritory } from '../hooks/useInternational.js';
import { TerritorySelect, LanguageSelect } from '../components/InternationalSelects.jsx';

export default function Register() {
  const { register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', territory: '', language: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: intl } = useInternational();
  const defaultLangFor = (code) => intl?.territories.find((x) => x.code === code)?.languages[0] || 'en';
  useEffect(() => {
    if (!intl || form.territory) return;
    const guess = guessTerritory(new Set(intl.territories.map((x) => x.code)));
    if (guess) setForm((f) => ({ ...f, territory: guess, language: defaultLangFor(guess) }));
  }, [intl]); // eslint-disable-line react-hooks/exhaustive-deps
  const setTerritory = (code) => setForm((f) => ({ ...f, territory: code, language: defaultLangFor(code) }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.password.length < 8) return setErr(t('auth.pwMin', { n: 8 }));
    if (form.password !== form.confirm) return setErr(t('auth.pwMismatch'));
    if (intl && !form.territory) return setErr(t('intl.territoryRequired'));
    setBusy(true);
    try {
      const r = await register(form.name.trim(), form.email.trim(), form.password, { territory: form.territory || undefined, language: form.language || undefined });
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
          {intl && (
            <>
              <div className="field"><label>{t('intl.territory')}</label><TerritorySelect territories={intl.territories} value={form.territory} onChange={setTerritory} required searchPlaceholder={t('intl.searchTerritory')} placeholder={t('intl.selectTerritory')} /></div>
              {form.territory && <div className="field"><label>{t('intl.workingLanguage')}</label><LanguageSelect languages={intl.languages} preferred={intl.territories.find((x) => x.code === form.territory)?.languages} value={form.language} onChange={(v) => setForm((f) => ({ ...f, language: v }))} /></div>}
            </>
          )}
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
