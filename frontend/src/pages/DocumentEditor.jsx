import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getToken } from '../api/client.js';
import { PageHead, StatusBadge, Empty, Notice } from '../components/ui.jsx';
import { useAuth, atLeast } from '../context/AuthContext.jsx';

export default function DocumentEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');
  const [contentText, setContentText] = useState('');
  const [comment, setComment] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get(`/documents/${id}`);
      const d = data.document || data;
      setDoc(d);
      setContentText(JSON.stringify(d.content, null, 2));
    } catch {
      setMsg({ type: 'err', text: 'Could not load document.' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const editable = doc && ['draft', 'in_review'].includes(doc.status) && atLeast(user?.role, 'officer');

  const saveContent = async () => {
    let parsed;
    try {
      parsed = JSON.parse(contentText);
    } catch {
      return setMsg({ type: 'err', text: 'Content is not valid JSON.' });
    }
    setBusy('save');
    try {
      await api.put(`/documents/${id}`, { content: parsed });
      setMsg({ type: 'ok', text: 'Saved. Version incremented.' });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Save failed.' });
    } finally {
      setBusy('');
    }
  };

  const action = async (verb) => {
    setBusy(verb);
    try {
      await api.post(`/documents/${id}/${verb}`, { comment });
      setComment('');
      setMsg({ type: 'ok', text: `Document ${verb === 'submit' ? 'submitted for review' : verb + 'd'}.` });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || `Could not ${verb}.` });
    } finally {
      setBusy('');
    }
  };

  const exportDocx = async () => {
    setBusy('export');
    try {
      const res = await api.post(`/documents/${id}/export`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(doc.title || 'document').replace(/[^a-z0-9]+/gi, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg({ type: 'err', text: 'Export failed.' });
    } finally {
      setBusy('');
    }
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;
  if (!doc) return <Empty>Document not found.</Empty>;

  return (
    <>
      <PageHead
        title={doc.title}
        subtitle={`${doc.type.replace(/_/g, ' ')} · v${doc.version}${doc.referenceNumber ? ' · ' + doc.referenceNumber : ''}`}
        actions={
          <>
            <button className="btn secondary" onClick={exportDocx} disabled={busy === 'export'}>
              {busy === 'export' ? <span className="spinner" /> : 'Export DOCX'}
            </button>
            <Link className="btn ghost" to="/documents">Back</Link>
          </>
        }
      />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}

      <div className="grid cols-2">
        <div className="card">
          <div className="card-head">
            <h3>Content</h3>
            <StatusBadge value={doc.status} />
          </div>
          <div className="card-body">
            <DocPreview doc={doc} />
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><h3>Workflow</h3>{doc.aiAssisted && <span className="badge blue">AI-assisted draft</span>}</div>
            <div className="card-body">
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Audit chain: audio → transcript → AI draft → human edit → approval → final. Every step is recorded.
              </p>
              <div className="field">
                <label>Comment (optional)</label>
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note for the record" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {doc.status === 'draft' && <button className="btn" onClick={() => action('submit')} disabled={busy === 'submit'}>Submit for review</button>}
                {doc.status === 'in_review' && atLeast(user?.role, 'admin') && (
                  <>
                    <button className="btn" onClick={() => action('approve')} disabled={busy === 'approve'}>Approve</button>
                    <button className="btn danger" onClick={() => action('reject')} disabled={busy === 'reject'}>Reject</button>
                  </>
                )}
                {doc.status === 'approved' && atLeast(user?.role, 'admin') && (
                  <button className="btn" onClick={() => action('finalize')} disabled={busy === 'finalize'}>Finalize</button>
                )}
                {doc.status === 'final' && <span className="badge blue">Final — locked for editing</span>}
              </div>
            </div>
          </div>

          {editable && (
            <div className="card">
              <div className="card-head"><h3>Edit content (JSON)</h3></div>
              <div className="card-body">
                <p className="muted" style={{ fontSize: '0.8rem' }}>
                  Structured content drives the branded DOCX. Edit the fields below and save; branding and layout are applied automatically on export.
                </p>
                <textarea value={contentText} onChange={(e) => setContentText(e.target.value)} style={{ minHeight: 260, fontFamily: 'monospace', fontSize: '0.82rem' }} />
                <button className="btn" style={{ marginTop: '0.6rem' }} onClick={saveContent} disabled={busy === 'save'}>
                  {busy === 'save' ? <span className="spinner" /> : 'Save content'}
                </button>
              </div>
            </div>
          )}

          {doc.approvals?.length > 0 && (
            <div className="card">
              <div className="card-head"><h3>Approval history</h3></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table>
                  <tbody>
                    {doc.approvals.map((a) => (
                      <tr key={a.id}>
                        <td>{a.action}</td>
                        <td className="muted" style={{ fontSize: '0.8rem' }}>{a.comment || '—'}</td>
                        <td className="muted mono" style={{ fontSize: '0.76rem', textAlign: 'right' }}>{new Date(a.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Human-readable rendering of the structured content JSON. */
function DocPreview({ doc }) {
  const c = doc.content || {};
  return (
    <div className="doc-preview">
      <div className="letterhead">
        <div className="l1">REPUBLIC OF KENYA</div>
        <div className="l2">OFFICE OF THE PRESIDENT — PROVINCIAL ADMINISTRATION</div>
        {doc.department && <div className="l2">{doc.department}</div>}
      </div>

      {c.heading && <h2 style={{ textAlign: 'center' }}>{c.heading}</h2>}
      {c.subject && <p><strong>RE: {c.subject}</strong></p>}
      {c.preamble && <p>{c.preamble}</p>}
      {c.body && <p style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>}

      {Array.isArray(c.sections) && c.sections.map((s, i) => (
        <div key={i}>
          {s.title && <h3>{s.title}</h3>}
          {s.content && <p style={{ whiteSpace: 'pre-wrap' }}>{s.content}</p>}
          {Array.isArray(s.points) && <ul>{s.points.map((p, j) => <li key={j}>{p}</li>)}</ul>}
        </div>
      ))}

      {Array.isArray(c.action_matrix) && c.action_matrix.length > 0 && (
        <>
          <h3>Action Matrix</h3>
          <table style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem' }}>
            <thead><tr><th>Action</th><th>Responsible</th><th>Timeline</th></tr></thead>
            <tbody>
              {c.action_matrix.map((a, i) => (
                <tr key={i}><td>{a.action}</td><td>{a.responsible}</td><td>{a.timeline}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {c.closing && <p style={{ marginTop: '1.5rem' }}>{c.closing}</p>}
      {!c.heading && !c.body && !c.sections && (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--sans)', fontSize: '0.85rem' }}>{JSON.stringify(c, null, 2)}</pre>
      )}
    </div>
  );
}
