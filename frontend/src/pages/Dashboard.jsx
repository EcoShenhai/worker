import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead, StatusBadge, Empty } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, d, a] = await Promise.all([
          api.get('/sessions'),
          api.get('/documents'),
          api.get('/workspace/outstanding-actions').catch(() => ({ data: { actions: [] } })),
        ]);
        setSessions(s.data.sessions || s.data || []);
        setDocuments(d.data.documents || d.data || []);
        setActions(a.data.actions || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingReview = documents.filter((d) => d.status === 'in_review').length;
  const drafts = documents.filter((d) => d.status === 'draft').length;

  return (
    <>
      <PageHead
        title={`Welcome, ${user?.name?.split(' ')[0] || 'Officer'}`}
        subtitle="Your administrative workspace — capture, draft, review and file."
        actions={<Link className="btn" to="/sessions">New session</Link>}
      />

      {loading ? (
        <div className="empty"><span className="spinner" /></div>
      ) : (
        <>
          <div className="grid cols-4" style={{ marginBottom: '1.4rem' }}>
            <div className="card stat"><div className="n">{sessions.length}</div><div className="l">Sessions</div></div>
            <div className="card stat"><div className="n">{documents.length}</div><div className="l">Documents</div></div>
            <div className="card stat"><div className="n">{pendingReview}</div><div className="l">Awaiting review</div></div>
            <div className="card stat"><div className="n">{actions.length}</div><div className="l">Outstanding actions</div></div>
          </div>

          <div className="grid cols-2">
            <div className="card">
              <div className="card-head"><h3>Recent sessions</h3><Link to="/sessions" className="muted">View all</Link></div>
              <div className="card-body" style={{ padding: 0 }}>
                {sessions.length === 0 ? <Empty>No sessions yet.</Empty> : (
                  <table>
                    <tbody>
                      {sessions.slice(0, 6).map((s) => (
                        <tr key={s.id}>
                          <td><Link to={`/sessions/${s.id}`}>{s.title}</Link><div className="muted" style={{ fontSize: '0.78rem' }}>{s.kind} · {s.occurredOn || '—'}</div></td>
                          <td style={{ textAlign: 'right' }}><StatusBadge value={s.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Documents to action</h3><Link to="/documents" className="muted">View all</Link></div>
              <div className="card-body" style={{ padding: 0 }}>
                {documents.filter((d) => ['draft', 'in_review'].includes(d.status)).length === 0 ? (
                  <Empty>Nothing needs your attention.</Empty>
                ) : (
                  <table>
                    <tbody>
                      {documents.filter((d) => ['draft', 'in_review'].includes(d.status)).slice(0, 6).map((d) => (
                        <tr key={d.id}>
                          <td><Link to={`/documents/${d.id}`}>{d.title}</Link><div className="muted" style={{ fontSize: '0.78rem' }}>{d.type.replace(/_/g, ' ')}</div></td>
                          <td style={{ textAlign: 'right' }}><StatusBadge value={d.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
