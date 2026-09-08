import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, StatusBadge, Empty, Notice } from '../../components/ui.jsx';

const ROLES = ['viewer', 'officer', 'admin'];

export default function Users() {
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
      setMsg({ type: 'ok', text: temp ? `User created. Temporary password: ${temp} — share securely; they must change it on first login.` : 'User created.' });
      setForm({ name: '', email: '', role: 'officer', department: '' });
      setCreating(false);
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Could not create user.' });
    }
  };

  const setStatus = async (u, status) => {
    await api.put(`/admin/users/${u.id}`, { status });
    load();
  };
  const remove = async (u) => {
    if (!confirm(`Remove ${u.name}?`)) return;
    try { await api.delete(`/admin/users/${u.id}`); load(); }
    catch (e) { setMsg({ type: 'err', text: e.response?.data?.message || 'Could not remove.' }); }
  };

  return (
    <>
      <PageHead title="Users" subtitle="Manage access. The superadmin account cannot be modified here."
        actions={<button className="btn" onClick={() => setCreating((v) => !v)}>{creating ? 'Cancel' : 'Add user'}</button>} />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}

      {creating && (
        <div className="card" style={{ marginBottom: '1.4rem' }}><div className="card-body">
          <form onSubmit={create}>
            <div className="row">
              <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            </div>
            <div className="row">
              <div className="field"><label>Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
              <div className="field"><label>Department</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            </div>
            <button className="btn">Create user</button>
          </form>
        </div></div>
      )}

      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        {loading ? <div className="empty"><span className="spinner" /></div> : users.length === 0 ? <Empty>No users.</Empty> : (
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="muted">{u.email}</td>
                  <td><span className="badge grey">{u.role}</span></td>
                  <td><StatusBadge value={u.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    {u.role !== 'superadmin' && (
                      <>
                        {u.status === 'active'
                          ? <button className="btn ghost sm" onClick={() => setStatus(u, 'suspended')}>Suspend</button>
                          : <button className="btn ghost sm" onClick={() => setStatus(u, 'active')}>Reinstate</button>}
                        <button className="btn ghost sm" onClick={() => remove(u)}>Remove</button>
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
