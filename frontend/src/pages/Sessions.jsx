import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead, StatusBadge, Empty, Notice, useLabel } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

const KINDS = ['meeting', 'interview', 'briefing', 'dictation', 'field_report', 'consultation', 'other'];
const CLASS = ['unclassified', 'internal', 'confidential', 'restricted'];

export default function Sessions() {
  const { t } = useI18n();
  const label = useLabel();
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
      setErr(e.response?.data?.message || t('sessions.createFailed'));
    }
  };

  return (
    <>
      <PageHead
        title={t('nav.sessions')}
        subtitle={t('sessions.subtitle')}
        actions={<button className="btn" onClick={() => setCreating((v) => !v)}>{creating ? t('common.cancel') : t('sessions.new')}</button>}
      />

      {creating && (
        <div className="card" style={{ marginBottom: '1.4rem' }}>
          <div className="card-body">
            <Notice type="err">{err}</Notice>
            <form onSubmit={create}>
              <div className="field">
                <label>{t('sessions.fields.title')}</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('sessions.titlePlaceholder')} required />
              </div>
              <div className="row">
                <div className="field">
                  <label>{t('sessions.fields.kind')}</label>
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    {KINDS.map((k) => <option key={k} value={k}>{label('kind', k)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{t('sessions.fields.classification')}</label>
                  <select value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}>
                    {CLASS.map((c) => <option key={c} value={c}>{label('classification', c)}</option>)}
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>{t('sessions.fields.department')}</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
                <div className="field">
                  <label>{t('sessions.fields.date')}</label>
                  <input type="date" value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} />
                </div>
                <div className="field">
                  <label>{t('sessions.fields.location')}</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <button className="btn">{t('sessions.create')}</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="empty"><span className="spinner" /></div> : sessions.length === 0 ? (
            <Empty>{t('sessions.empty')}</Empty>
          ) : (
            <table>
              <thead><tr><th>{t('sessions.fields.title')}</th><th>{t('sessions.fields.kind')}</th><th>{t('sessions.fields.date')}</th><th>{t('sessions.fields.classification')}</th><th>{t('sessions.fields.status')}</th></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/sessions/${s.id}`}>{s.title}</Link></td>
                    <td className="muted">{label('kind', s.kind)}</td>
                    <td className="muted mono">{s.occurredOn || '—'}</td>
                    <td><span className="badge grey">{label('classification', s.classification)}</span></td>
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
