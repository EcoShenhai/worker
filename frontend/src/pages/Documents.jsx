import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead, StatusBadge, Empty, Notice, useLabel } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import TEMPLATES from '../builtinTemplates.js';

const TYPES = ['minutes', 'memo', 'letter', 'report', 'policy_brief', 'briefing_note', 'concept_note', 'circular', 'action_matrix', 'speech'];

export default function Documents() {
  const { t: tr } = useI18n();
  const label = useLabel();
  const tplText = (tpl, field, fallback) => { const k = `templates.${tpl.id}.${field}`; const v = tr(k); return v === k ? fallback : v; };
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [drafting, setDrafting] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type: 'memo', title: '', brief: '', recipient: '', department: '' });
  const [templating, setTemplating] = useState(false);
  const [tplType, setTplType] = useState('all');
  const [customTemplates, setCustomTemplates] = useState([]);

  const onSpreadsheet = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await api.post('/documents/from-spreadsheet', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const doc = data.document || data;
      window.location.href = `/documents/${doc.id}`;
    } catch (e) {
      setErr(e.response?.data?.message || tr('documents.spreadsheetFailed'));
      setBusy(false);
    }
  };

  const createFromTemplate = async (t) => {
    setBusy(true); setErr('');
    try {
      const { data } = await api.post('/documents', { type: t.documentType, title: t.name + ' — draft', content: t.content });
      const doc = data.document || data;
      window.location.href = `/documents/${doc.id}`;
    } catch (e) {
      setErr(e.response?.data?.message || tr('documents.templateFailed'));
      setBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/documents');
      setDocs(data.documents || data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); api.get('/templates').then(({ data }) => setCustomTemplates(data.templates || [])).catch(() => {}); }, []);

  const draft = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { data } = await api.post('/documents/draft', form);
      const doc = data.document || data;
      window.location.href = `/documents/${doc.id}`;
    } catch (e) {
      setErr(e.response?.data?.message || tr('documents.draftFailed'));
      setBusy(false);
    }
  };

  const shown = filter === 'all' ? docs : docs.filter((d) => d.type === filter);

  return (
    <>
      <PageHead
        title={tr('nav.documents')}
        subtitle={tr('documents.subtitle')}
        actions={
          <>
            <button className="btn secondary" onClick={() => { setTemplating((v) => !v); setDrafting(false); }}>{templating ? tr('common.cancel') : tr('documents.startFromTemplate')}</button>
            <label className="btn secondary" style={{ margin: 0 }}>
              {tr('documents.fromSpreadsheet')}
              <input type="file" accept=".xlsx,.xls,.csv" onChange={onSpreadsheet} style={{ display: 'none' }} disabled={busy} />
            </label>
            <button className="btn" onClick={() => { setDrafting((v) => !v); setTemplating(false); }}>{drafting ? tr('common.cancel') : tr('documents.draftWithAI')}</button>
          </>
        }
      />

      {templating && (
        <div className="card" style={{ marginBottom: '1.4rem' }}>
          <div className="card-head">
            <h3>{tr('documents.templateTitle')}</h3>
            <select value={tplType} onChange={(e) => setTplType(e.target.value)} style={{ width: 220 }}>
              <option value="all">{tr('documents.allTypes')}</option>
              {TYPES.map((t) => <option key={t} value={t}>{label('docType', t)}</option>)}
            </select>
          </div>
          <div className="card-body">
            <Notice type="err">{err}</Notice>
            {customTemplates.filter((t) => tplType === 'all' || t.documentType === tplType).length > 0 && (
              <>
                <div className="muted" style={{ fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{tr('documents.orgTemplates')}</div>
                <div className="grid cols-3" style={{ marginBottom: '1.2rem' }}>
                  {customTemplates.filter((t) => tplType === 'all' || t.documentType === tplType).map((t) => (
                    <div key={t.id} className="card" style={{ boxShadow: 'none' }}>
                      <div className="card-body">
                        <div style={{ fontWeight: 600 }}>{tplText(t, 'name', t.name)}</div>
                        <div className="badge green" style={{ margin: '0.3rem 0' }}>{label('docType', t.documentType)}</div>
                        <p className="muted" style={{ fontSize: '0.82rem', minHeight: 20 }}>{tr('documents.savedByOrg')}</p>
                        <button className="btn sm block" disabled={busy} onClick={() => createFromTemplate(t)}>{tr('documents.useTemplate')}</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="muted" style={{ fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{tr('documents.generalTemplates')}</div>
              </>
            )}
            <div className="grid cols-3">
              {TEMPLATES.filter((t) => tplType === 'all' || t.documentType === tplType).map((t) => (
                <div key={t.id} className="card" style={{ boxShadow: 'none' }}>
                  <div className="card-body">
                    <div style={{ fontWeight: 600 }}>{tplText(t, 'name', t.name)}</div>
                    <div className="badge grey" style={{ margin: '0.3rem 0' }}>{label('docType', t.documentType)}</div>
                    <p className="muted" style={{ fontSize: '0.82rem', minHeight: 38 }}>{tplText(t, 'desc', t.description)}</p>
                    <button className="btn sm block" disabled={busy} onClick={() => createFromTemplate(t)}>{tr('documents.useTemplate')}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {drafting && (
        <div className="card" style={{ marginBottom: '1.4rem' }}>
          <div className="card-body">
            <Notice type="err">{err}</Notice>
            <form onSubmit={draft}>
              <div className="row">
                <div className="field">
                  <label>{tr('documents.fields.type')}</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPES.filter((t) => t !== 'minutes').map((t) => <option key={t} value={t}>{label('docType', t)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{tr('documents.fields.title')}</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>{tr('documents.fields.recipient')}</label>
                  <input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
                </div>
                <div className="field">
                  <label>{tr('documents.fields.department')}</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>{tr('documents.fields.brief')}</label>
                <textarea value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })}
                  placeholder={tr('documents.briefPlaceholder')} required />
              </div>
              <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : tr('documents.generateDraft')}</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }}>
            <option value="all">{tr('documents.allTypes')}</option>
            {TYPES.map((t) => <option key={t} value={t}>{label('docType', t)}</option>)}
          </select>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="empty"><span className="spinner" /></div> : shown.length === 0 ? (
            <Empty>{tr('documents.empty')}</Empty>
          ) : (
            <table>
              <thead><tr><th>{tr('documents.table.title')}</th><th>{tr('documents.table.type')}</th><th>{tr('documents.table.ref')}</th><th>{tr('documents.table.status')}</th><th>{tr('documents.table.ver')}</th></tr></thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.id}>
                    <td><Link to={`/documents/${d.id}`}>{d.title}</Link>{d.aiAssisted && <span className="badge blue" style={{ marginLeft: 6 }}>AI</span>}</td>
                    <td className="muted">{label('docType', d.type)}</td>
                    <td className="muted mono" style={{ fontSize: '0.8rem' }}>{d.referenceNumber || '—'}</td>
                    <td><StatusBadge value={d.status} /></td>
                    <td className="mono">{d.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
