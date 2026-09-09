import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, Notice } from '../../components/ui.jsx';

export default function TenantSettings() {
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
      setMsg({ type: 'ok', text: 'Organisation details saved. They appear on every document you export.' });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Could not save.' });
    } finally { setBusy(''); }
  };

  const upload = async (kind, file) => {
    if (!file) return;
    setBusy(kind); setMsg(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      await api.post(`/tenant/${kind}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ type: 'ok', text: `${kind === 'logo' ? 'Logo' : 'Signature'} uploaded.` });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Upload failed.' });
    } finally { setBusy(''); }
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;
  if (!t) return (
    <>
      <PageHead title="Organisation" subtitle="Branding for your workspace." />
      <div className="card"><div className="card-body"><p className="muted">This account is not associated with an organisation.</p></div></div>
    </>
  );

  return (
    <>
      <PageHead title="Organisation" subtitle="Your name, letterhead, logo and signature appear on every document you generate." />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <div className="grid cols-2">
        <div className="card">
          <div className="card-head"><h3>Letterhead</h3></div>
          <div className="card-body">
            <form onSubmit={save}>
              <div className="field"><label>Organisation name</label><input value={t.name || ''} onChange={(e) => setT({ ...t, name: e.target.value })} required /></div>
              <div className="field"><label>Letterhead line 1</label><input value={t.letterheadLine1 || ''} onChange={(e) => setT({ ...t, letterheadLine1: e.target.value })} placeholder="e.g. COUNTY GOVERNMENT OF ..." /></div>
              <div className="field"><label>Letterhead line 2</label><input value={t.letterheadLine2 || ''} onChange={(e) => setT({ ...t, letterheadLine2: e.target.value })} placeholder="e.g. Department of ..." /></div>
              <div className="field"><label>Letterhead line 3</label><input value={t.letterheadLine3 || ''} onChange={(e) => setT({ ...t, letterheadLine3: e.target.value })} placeholder="e.g. Unit / Office" /></div>
              <button className="btn" disabled={busy === 'save'}>{busy === 'save' ? <span className="spinner" /> : 'Save letterhead'}</button>
            </form>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.8rem', marginBottom: 0 }}>Leave lines blank to fall back to your organisation name.</p>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Logo &amp; signature</h3></div>
          <div className="card-body">
            <div className="field">
              <label>Crest / logo (PNG or JPG) {t.hasLogo && <span className="badge green">uploaded</span>}</label>
              <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => upload('logo', e.target.files?.[0])} disabled={busy === 'logo'} />
            </div>
            <div className="field">
              <label>E-signature (PNG or JPG) {t.hasSignature && <span className="badge green">uploaded</span>}</label>
              <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => upload('signature', e.target.files?.[0])} disabled={busy === 'signature'} />
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
              The logo appears in the document header and on slide title pages. The signature is placed at the end of exported documents. Use a transparent-background PNG for best results.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
