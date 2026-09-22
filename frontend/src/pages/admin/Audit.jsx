import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { PageHead, Empty } from '../../components/ui.jsx';
import { useI18n } from '../../i18n/index.jsx';

export default function Audit() {
  const { t } = useI18n();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/admin/audit');
        setLogs(data.logs || data.audit || data || []);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <>
      <PageHead title={t('nav.audit')} subtitle={t('audit.subtitle')} />
      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        {loading ? <div className="empty"><span className="spinner" /></div> : logs.length === 0 ? <Empty>{t('audit.empty')}</Empty> : (
          <table>
            <thead><tr><th>{t('audit.table.when')}</th><th>{t('audit.table.actor')}</th><th>{t('audit.table.action')}</th><th>{t('audit.table.resource')}</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="muted mono" style={{ fontSize: '0.78rem' }}>{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.user?.name || l.userId || t('audit.system')}</td>
                  <td><span className="badge grey">{l.action}</span></td>
                  <td className="muted" style={{ fontSize: '0.82rem' }}>{l.resourceType}{l.resourceId ? ` · ${String(l.resourceId).slice(0, 8)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div></div>
    </>
  );
}
