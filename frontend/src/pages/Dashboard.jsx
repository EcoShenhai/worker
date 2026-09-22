import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead, StatusBadge, Empty, useLabel } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const label = useLabel();
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
        title={t('dashboard.welcome', { name: user?.name?.split(' ')[0] || t('dashboard.defaultName') })}
        subtitle={t('dashboard.subtitle')}
        actions={<Link className="btn" to="/sessions">{t('sessions.new')}</Link>}
      />

      {loading ? (
        <div className="empty"><span className="spinner" /></div>
      ) : (
        <>
          <div className="grid cols-4" style={{ marginBottom: '1.4rem' }}>
            <div className="card stat"><div className="n">{sessions.length}</div><div className="l">{t('dashboard.stats.sessions')}</div></div>
            <div className="card stat"><div className="n">{documents.length}</div><div className="l">{t('dashboard.stats.documents')}</div></div>
            <div className="card stat"><div className="n">{pendingReview}</div><div className="l">{t('dashboard.stats.awaitingReview')}</div></div>
            <div className="card stat"><div className="n">{actions.length}</div><div className="l">{t('dashboard.stats.outstandingActions')}</div></div>
          </div>

          <div className="grid cols-2">
            <div className="card">
              <div className="card-head"><h3>{t('dashboard.recentSessions')}</h3><Link to="/sessions" className="muted">{t('common.viewAll')}</Link></div>
              <div className="card-body" style={{ padding: 0 }}>
                {sessions.length === 0 ? <Empty>{t('dashboard.noSessions')}</Empty> : (
                  <table>
                    <tbody>
                      {sessions.slice(0, 6).map((s) => (
                        <tr key={s.id}>
                          <td><Link to={`/sessions/${s.id}`}>{s.title}</Link><div className="muted" style={{ fontSize: '0.78rem' }}>{label('kind', s.kind)} · {s.occurredOn || '—'}</div></td>
                          <td style={{ textAlign: 'right' }}><StatusBadge value={s.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>{t('dashboard.documentsToAction')}</h3><Link to="/documents" className="muted">{t('common.viewAll')}</Link></div>
              <div className="card-body" style={{ padding: 0 }}>
                {documents.filter((d) => ['draft', 'in_review'].includes(d.status)).length === 0 ? (
                  <Empty>{t('dashboard.nothingToAction')}</Empty>
                ) : (
                  <table>
                    <tbody>
                      {documents.filter((d) => ['draft', 'in_review'].includes(d.status)).slice(0, 6).map((d) => (
                        <tr key={d.id}>
                          <td><Link to={`/documents/${d.id}`}>{d.title}</Link><div className="muted" style={{ fontSize: '0.78rem' }}>{label('docType', d.type)}</div></td>
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
