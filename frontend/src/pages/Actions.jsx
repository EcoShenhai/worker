import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { PageHead, Empty } from '../components/ui.jsx';

export default function Actions() {
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
      <PageHead title="Outstanding Actions" subtitle="Action items extracted from minutes and action matrices across sessions." />
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="empty"><span className="spinner" /></div> : actions.length === 0 ? (
            <Empty>No outstanding actions found.</Empty>
          ) : (
            <table>
              <thead><tr><th>Action</th><th>Responsible</th><th>Timeline</th><th>Source</th></tr></thead>
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
