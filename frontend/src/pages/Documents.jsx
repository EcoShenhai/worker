import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead, StatusBadge, Empty, Notice } from '../components/ui.jsx';

const TYPES = ['minutes', 'memo', 'letter', 'report', 'policy_brief', 'briefing_note', 'concept_note', 'circular', 'action_matrix'];

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [drafting, setDrafting] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type: 'memo', title: '', brief: '', recipient: '', department: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/documents');
      setDocs(data.documents || data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const draft = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { data } = await api.post('/documents/draft', form);
      const doc = data.document || data;
      window.location.href = `/documents/${doc.id}`;
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not draft document.');
      setBusy(false);
    }
  };

  const shown = filter === 'all' ? docs : docs.filter((d) => d.type === filter);

  return (
    <>
      <PageHead
        title="Documents"
        subtitle="Minutes, memos, letters, reports and briefs — drafted with AI, approved by people."
        actions={<button className="btn" onClick={() => setDrafting((v) => !v)}>{drafting ? 'Cancel' : 'Draft with AI'}</button>}
      />

      {drafting && (
        <div className="card" style={{ marginBottom: '1.4rem' }}>
          <div className="card-body">
            <Notice type="err">{err}</Notice>
            <form onSubmit={draft}>
              <div className="row">
                <div className="field">
                  <label>Document type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPES.filter((t) => t !== 'minutes').map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Title</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Recipient (optional)</label>
                  <input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
                </div>
                <div className="field">
                  <label>Department (optional)</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Instructions / brief</label>
                <textarea value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })}
                  placeholder="Describe the purpose, key points, and any facts to include. The assistant will draft a formal document you can edit and approve." required />
              </div>
              <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : 'Generate draft'}</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }}>
            <option value="all">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="empty"><span className="spinner" /></div> : shown.length === 0 ? (
            <Empty>No documents yet.</Empty>
          ) : (
            <table>
              <thead><tr><th>Title</th><th>Type</th><th>Ref.</th><th>Status</th><th>Ver.</th></tr></thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.id}>
                    <td><Link to={`/documents/${d.id}`}>{d.title}</Link>{d.aiAssisted && <span className="badge blue" style={{ marginLeft: 6 }}>AI</span>}</td>
                    <td className="muted">{d.type.replace(/_/g, ' ')}</td>
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
