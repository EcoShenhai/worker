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

  const exportAs = async (fmt) => {
    const paths = { docx: '/export', pptx: '/export-pptx', xlsx: '/export-xlsx' };
    setBusy('export-' + fmt);
    try {
      const res = await api.post(`/documents/${id}${paths[fmt]}`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(doc.title || 'document').replace(/[^a-z0-9]+/gi, '_')}.${fmt}`;
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
            <button className="btn secondary" onClick={() => exportAs('docx')} disabled={busy.startsWith('export')}>
              {busy === 'export-docx' ? <span className="spinner" /> : 'Export DOCX'}
            </button>
            <button className="btn secondary" onClick={() => exportAs('pptx')} disabled={busy.startsWith('export')}>
              {busy === 'export-pptx' ? <span className="spinner" /> : 'Export PPTX'}
            </button>
            {(Array.isArray(doc.content?.tables) && doc.content.tables.length) || (Array.isArray(doc.content?.action_matrix) && doc.content.action_matrix.length) ? (
              <button className="btn secondary" onClick={() => exportAs('xlsx')} disabled={busy.startsWith('export')}>
                {busy === 'export-xlsx' ? <span className="spinner" /> : 'Export XLSX'}
              </button>
            ) : null}
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
  const wrap = { whiteSpace: 'pre-wrap' };
  const has = (k) => c[k] !== undefined && c[k] !== null && c[k] !== '';
  const known = ['title','heading','to','from','through','date','recipient_block','salutation','subject',
    'executive_summary','preamble','body','paragraphs','sections','action_matrix','recommendations','closing','signoff','signature','tables'];
  const anyKnown = known.some((k) => Array.isArray(c[k]) ? c[k].length : has(k));
  return (
    <div className="doc-preview">
      <div className="letterhead">
        <div className="l1">REPUBLIC OF KENYA</div>
        <div className="l2">OFFICE OF THE PRESIDENT — PROVINCIAL ADMINISTRATION</div>
        {doc.department && <div className="l2">{doc.department}</div>}
      </div>

      {has('title') && <h2 style={{ textAlign: 'center' }}>{c.title}</h2>}
      {has('heading') && <h2 style={{ textAlign: 'center' }}>{c.heading}</h2>}

      {(has('to') || has('from') || has('through')) && (
        <table style={{ fontFamily: 'var(--sans)', fontSize: '0.88rem', marginBottom: '0.8rem' }}><tbody>
          {has('to') && <tr><td style={{ fontWeight: 600, width: 90 }}>TO</td><td>{c.to}</td></tr>}
          {has('from') && <tr><td style={{ fontWeight: 600 }}>FROM</td><td>{c.from}</td></tr>}
          {has('through') && <tr><td style={{ fontWeight: 600 }}>THROUGH</td><td>{c.through}</td></tr>}
        </tbody></table>
      )}

      {has('date') && <p style={{ textAlign: 'right' }}>{c.date}</p>}
      {has('recipient_block') && <p style={wrap}>{c.recipient_block}</p>}
      {has('salutation') && <p>{c.salutation}</p>}
      {has('subject') && <p><strong>RE: {c.subject}</strong></p>}

      {has('executive_summary') && <><h3>Executive Summary</h3><p style={wrap}>{c.executive_summary}</p></>}
      {has('preamble') && <p style={wrap}>{c.preamble}</p>}
      {has('body') && <p style={wrap}>{c.body}</p>}

      {Array.isArray(c.paragraphs) && c.paragraphs.map((para, i) => <p key={i} style={wrap}>{para}</p>)}

      {Array.isArray(c.sections) && c.sections.map((sec, i) => (
        <div key={i}>
          {sec.title && <h3>{sec.title}</h3>}
          {(sec.content || sec.body) && <p style={wrap}>{sec.content || sec.body}</p>}
          {Array.isArray(sec.points) && <ul>{sec.points.map((pt, j) => <li key={j}>{pt}</li>)}</ul>}
        </div>
      ))}

      {Array.isArray(c.action_matrix) && c.action_matrix.length > 0 && (
        <>
          <h3>Action Matrix</h3>
          <table style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem' }}>
            <thead><tr><th>Action</th><th>Responsible</th><th>Timeline</th></tr></thead>
            <tbody>
              {c.action_matrix.map((a, i) => (<tr key={i}><td>{a.action}</td><td>{a.responsible}</td><td>{a.timeline}</td></tr>))}
            </tbody>
          </table>
        </>
      )}

      {Array.isArray(c.recommendations) && c.recommendations.length > 0 && (
        <><h3>Recommendations</h3><ol>{c.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol></>
      )}

      {Array.isArray(c.tables) && c.tables.map((t, ti) => (
        <div key={ti} style={{ marginTop: '1rem' }}>
          {t.title && <h3>{t.title}</h3>}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem' }}>
              {Array.isArray(t.columns) && <thead><tr>{t.columns.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>}
              <tbody>
                {(t.rows || []).map((r, ri) => (<tr key={ri}>{(t.columns || r).map((_, ci) => <td key={ci}>{String(r[ci] == null ? '' : r[ci])}</td>)}</tr>))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {has('closing') && <p style={{ marginTop: '1.5rem', ...wrap }}>{c.closing}</p>}
      {has('signoff') && <p style={{ marginTop: '1rem', ...wrap }}>{c.signoff}</p>}
      {has('signature') && <p style={{ marginTop: '1rem', ...wrap }}>{c.signature}</p>}

      {!anyKnown && (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--sans)', fontSize: '0.85rem' }}>{JSON.stringify(c, null, 2)}</pre>
      )}
    </div>
  );
}
