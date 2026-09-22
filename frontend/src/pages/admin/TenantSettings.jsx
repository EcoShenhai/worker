import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, Notice } from '../../components/ui.jsx';
import { useI18n } from '../../i18n/index.jsx';

export default function TenantSettings() {
  const { t: tr } = useI18n();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tenant');
      setT(data.tenant);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy('save'); setMsg(null);
    try {
      await api.put('/tenant', {
        name: t.name, letterheadLine1: t.letterheadLine1 || '', letterheadLine2: t.letterheadLine2 || '', letterheadLine3: t.letterheadLine3 || '',
      });
      setMsg({ type: 'ok', text: tr('tenant.saved') });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || tr('tenant.saveFailed') });
    } finally { setBusy(''); }
  };

  const upload = async (kind, file) => {
    if (!file) return;
    setBusy(kind); setMsg(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      await api.post(`/tenant/${kind}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ type: 'ok', text: tr(kind === 'logo' ? 'tenant.logoUploaded' : 'tenant.signatureUploaded') });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || tr('tenant.uploadFailed') });
    } finally { setBusy(''); }
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;
  if (!t) return (
    <>
      <PageHead title={tr('nav.organisation')} subtitle={tr('tenant.subtitleShort')} />
      <div className="card"><div className="card-body"><p className="muted">{tr('tenant.noOrg')}</p></div></div>
    </>
  );

  return (
    <>
      <PageHead title={tr('nav.organisation')} subtitle={tr('tenant.subtitle')} />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <div className="grid cols-2">
        <div className="card">
          <div className="card-head"><h3>{tr('tenant.letterhead')}</h3></div>
          <div className="card-body">
            <form onSubmit={save}>
              <div className="field"><label>{tr('tenant.orgName')}</label><input value={t.name || ''} onChange={(e) => setT({ ...t, name: e.target.value })} required /></div>
              <div className="field"><label>{tr('tenant.line', { n: 1 })}</label><input value={t.letterheadLine1 || ''} onChange={(e) => setT({ ...t, letterheadLine1: e.target.value })} placeholder={tr('tenant.line1Placeholder')} /></div>
              <div className="field"><label>{tr('tenant.line', { n: 2 })}</label><input value={t.letterheadLine2 || ''} onChange={(e) => setT({ ...t, letterheadLine2: e.target.value })} placeholder={tr('tenant.line2Placeholder')} /></div>
              <div className="field"><label>{tr('tenant.line', { n: 3 })}</label><input value={t.letterheadLine3 || ''} onChange={(e) => setT({ ...t, letterheadLine3: e.target.value })} placeholder={tr('tenant.line3Placeholder')} /></div>
              <button className="btn" disabled={busy === 'save'}>{busy === 'save' ? <span className="spinner" /> : tr('tenant.saveLetterhead')}</button>
            </form>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.8rem', marginBottom: 0 }}>{tr('tenant.blankHint')}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>{tr('tenant.logoSignature')}</h3></div>
          <div className="card-body">
            <div className="field">
              <label>{tr('tenant.logo')} {t.hasLogo && <span className="badge green">{tr('tenant.uploaded')}</span>}</label>
              <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => upload('logo', e.target.files?.[0])} disabled={busy === 'logo'} />
            </div>
            <div className="field">
              <label>{tr('tenant.signature')} {t.hasSignature && <span className="badge green">{tr('tenant.uploaded')}</span>}</label>
              <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => upload('signature', e.target.files?.[0])} disabled={busy === 'signature'} />
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
              {tr('tenant.brandingNote')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
