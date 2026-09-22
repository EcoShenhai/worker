import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { PageHead, Empty, Notice } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function Knowledge() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', extractedText: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/knowledge');
      setItems(data.items || data.documents || data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/knowledge', form);
      setForm({ title: '', category: '', extractedText: '' });
      setMsg({ type: 'ok', text: t('knowledge.added') });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('knowledge.addFailed') });
    } finally { setBusy(false); }
  };

  const [file, setFile] = useState(null);
  const [fmeta, setFmeta] = useState({ title: '', category: '' });

  const submitFile = async (e) => {
    e.preventDefault();
    if (!file) return setMsg({ type: 'err', text: t('knowledge.chooseFile') });
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (fmeta.title) fd.append('title', fmeta.title);
      if (fmeta.category) fd.append('category', fmeta.category);
      const { data } = await api.post('/knowledge', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.needsOcr) {
        setMsg({ type: 'warn', text: t('knowledge.ocrFailed') });
      } else if (data.extractedChars > 0) {
        setMsg({ type: 'ok', text: t('knowledge.extracted', { n: data.extractedChars }) });
      } else {
        setMsg({ type: 'ok', text: t('knowledge.noText') });
      }
      setFile(null); setFmeta({ title: '', category: '' });
      e.target.reset && e.target.reset();
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('knowledge.uploadFailed') });
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!confirm(t('knowledge.confirmRemove'))) return;
    await api.delete(`/knowledge/${id}`);
    load();
  };

  return (
    <>
      <PageHead title={t('nav.knowledge')} subtitle={t('knowledge.subtitle')} />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <div className="grid cols-2">
        <div className="stack">
          <div className="card">
            <div className="card-head"><h3>{t('knowledge.uploadTitle')}</h3></div>
            <div className="card-body">
              <form onSubmit={submitFile}>
                <div className="field"><label>{t('knowledge.file')}</label><input type="file" accept=".txt,.md,.csv,.tsv,.docx,.pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></div>
                <div className="row">
                  <div className="field"><label>{t('knowledge.titleOptional')}</label><input value={fmeta.title} onChange={(e) => setFmeta({ ...fmeta, title: e.target.value })} placeholder={t('knowledge.titleDefault')} /></div>
                  <div className="field"><label>{t('knowledge.categoryOptional')}</label><input value={fmeta.category} onChange={(e) => setFmeta({ ...fmeta, category: e.target.value })} /></div>
                </div>
                <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : t('knowledge.uploadExtract')}</button>
                <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.7rem', marginBottom: 0 }}>
                  {t('knowledge.uploadNote')}
                </p>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>{t('knowledge.pasteTitle')}</h3></div>
            <div className="card-body">
              <form onSubmit={submit}>
                <div className="field"><label>{t('knowledge.title')}</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div className="field"><label>{t('knowledge.category')}</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={t('knowledge.categoryPlaceholder')} /></div>
                <div className="field"><label>{t('knowledge.textContent')}</label><textarea value={form.extractedText} onChange={(e) => setForm({ ...form, extractedText: e.target.value })} style={{ minHeight: 140 }} required /></div>
                <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : t('knowledge.add')}</button>
              </form>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>{t('knowledge.references')}</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div className="empty"><span className="spinner" /></div> : items.length === 0 ? <Empty>{t('knowledge.empty')}</Empty> : (
              <table><tbody>
                {items.map((k) => (
                  <tr key={k.id}>
                    <td><div>{k.title}</div><div className="muted" style={{ fontSize: '0.78rem' }}>{k.category || t('knowledge.uncategorised')}</div></td>
                    <td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => remove(k.id)}>{t('knowledge.remove')}</button></td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
