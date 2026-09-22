import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { PageHead, Empty } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function Actions() {
  const { t } = useI18n();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/workspace/outstanding-actions');
        setActions(data.actions || []);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <>
      <PageHead title={t('nav.actions')} subtitle={t('actions.subtitle')} />
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="empty"><span className="spinner" /></div> : actions.length === 0 ? (
            <Empty>{t('actions.empty')}</Empty>
          ) : (
            <table>
              <thead><tr><th>{t('actions.table.action')}</th><th>{t('actions.table.responsible')}</th><th>{t('actions.table.timeline')}</th><th>{t('actions.table.source')}</th></tr></thead>
              <tbody>
                {actions.map((a, i) => (
                  <tr key={i}>
                    <td>{a.action}</td>
                    <td className="muted">{a.responsible || '—'}</td>
                    <td className="muted">{a.timeline || '—'}</td>
                    <td className="muted" style={{ fontSize: '0.8rem' }}>{a.documentTitle || a.source || '—'}</td>
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
