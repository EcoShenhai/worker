import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead, StatusBadge, Empty, Notice } from '../components/ui.jsx';

const KINDS = ['meeting', 'interview', 'briefing', 'dictation', 'field_report', 'consultation', 'other'];
const CLASS = ['unclassified', 'internal', 'confidential', 'restricted'];

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ title: '', kind: 'meeting', classification: 'internal', department: '', occurredOn: '', location: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sessions');
      setSessions(data.sessions || data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api.post('/sessions', { ...form, occurredOn: form.occurredOn || null });
      setForm({ title: '', kind: 'meeting', classification: 'internal', department: '', occurredOn: '', location: '' });
      setCreating(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not create session.');
    }
  };

  return (
    <>
      <PageHead
        title="Sessions & Recordings"
        subtitle="Each session is a case file — audio, transcript, and the documents produced from it."
        actions={<button className="btn" onClick={() => setCreating((v) => !v)}>{creating ? 'Cancel' : 'New session'}</button>}
      />

      {creating && (
        <div className="card" style={{ marginBottom: '1.4rem' }}>
          <div className="card-body">
            <Notice type="err">{err}</Notice>
            <form onSubmit={create}>
              <div className="field">
                <label>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. County Security Committee — Weekly Briefing" required />
              </div>
              <div className="row">
                <div className="field">
                  <label>Kind</label>
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    {KINDS.map((k) => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Classification</label>
                  <select value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}>
                    {CLASS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Department</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <button className="btn">Create session</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="empty"><span className="spinner" /></div> : sessions.length === 0 ? (
            <Empty>No sessions yet. Create one to begin recording.</Empty>
          ) : (
            <table>
              <thead><tr><th>Title</th><th>Kind</th><th>Date</th><th>Classification</th><th>Status</th></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/sessions/${s.id}`}>{s.title}</Link></td>
                    <td className="muted">{s.kind.replace(/_/g, ' ')}</td>
                    <td className="muted mono">{s.occurredOn || '—'}</td>
                    <td><span className="badge grey">{s.classification}</span></td>
                    <td><StatusBadge value={s.status} /></td>
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
