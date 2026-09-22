import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, StatusBadge, Empty, Notice, useLabel } from '../../components/ui.jsx';
import { useI18n } from '../../i18n/index.jsx';

const ROLES = ['viewer', 'officer', 'admin'];

export default function Users() {
  const { t } = useI18n();
  const label = useLabel();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'officer', department: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users || data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const { data } = await api.post('/admin/users', form);
      const temp = data.temporaryPassword;
      setMsg({ type: 'ok', text: temp ? t('users.createdTemp', { temp }) : t('users.created') });
      setForm({ name: '', email: '', role: 'officer', department: '' });
      setCreating(false);
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('users.createFailed') });
    }
  };

  const setStatus = async (u, status) => {
    await api.put(`/admin/users/${u.id}`, { status });
    load();
  };
  const remove = async (u) => {
    if (!confirm(t('users.confirmRemove', { name: u.name }))) return;
    try { await api.delete(`/admin/users/${u.id}`); load(); }
    catch (e) { setMsg({ type: 'err', text: e.response?.data?.message || t('users.removeFailed') }); }
  };

  return (
    <>
      <PageHead title={t('nav.users')} subtitle={t('users.subtitle')}
        actions={<button className="btn" onClick={() => setCreating((v) => !v)}>{creating ? t('common.cancel') : t('users.add')}</button>} />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}

      {creating && (
        <div className="card" style={{ marginBottom: '1.4rem' }}><div className="card-body">
          <form onSubmit={create}>
            <div className="row">
              <div className="field"><label>{t('users.fields.name')}</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="field"><label>{t('users.fields.email')}</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            </div>
            <div className="row">
              <div className="field"><label>{t('users.fields.role')}</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{label('roles', r)}</option>)}</select></div>
              <div className="field"><label>{t('users.fields.department')}</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            </div>
            <button className="btn">{t('users.create')}</button>
          </form>
        </div></div>
      )}

      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        {loading ? <div className="empty"><span className="spinner" /></div> : users.length === 0 ? <Empty>{t('users.empty')}</Empty> : (
          <table>
            <thead><tr><th>{t('users.fields.name')}</th><th>{t('users.fields.email')}</th><th>{t('users.fields.role')}</th><th>{t('users.fields.status')}</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="muted">{u.email}</td>
                  <td><span className="badge grey">{label('roles', u.role)}</span></td>
                  <td><StatusBadge value={u.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    {u.role !== 'superadmin' && (
                      <>
                        {u.status === 'active'
                          ? <button className="btn ghost sm" onClick={() => setStatus(u, 'suspended')}>{t('users.suspend')}</button>
                          : <button className="btn ghost sm" onClick={() => setStatus(u, 'active')}>{t('users.reinstate')}</button>}
                        <button className="btn ghost sm" onClick={() => remove(u)}>{t('users.remove')}</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div></div>
    </>
  );
}
