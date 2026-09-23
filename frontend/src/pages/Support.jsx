import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHead, Notice } from '../components/ui.jsx';

// Dual support (Dual Support Master Reference): in-app -> EcoBus -> ShenPort, and email ->
// support@theshenhai.com -> ShenPort IMAP. Same human support authority either way.
const APP_CODE = 'WORKER';
const SUPPORT_EMAIL = 'support@theshenhai.com';
const fmt = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const errMsg = (e, f) => e?.response?.data?.error?.message || e?.response?.data?.message || f;
const box = { border: '1px solid rgba(128,128,128,0.25)', borderRadius: 10, padding: '1rem 1.1rem', marginTop: '0.8rem' };

export default function Support() {
  const { user } = useAuth();
  const [subject, setSubject] = useState(''); const [body, setBody] = useState('');
  const [sending, setSending] = useState(false); const [error, setError] = useState(''); const [result, setResult] = useState(null);
  const [inbox, setInbox] = useState(null); const [linked, setLinked] = useState(null);

  const loadInbox = useCallback(() => {
    api.get('/support/inbox').then(({ data }) => { setInbox(data.tickets || []); setLinked(!!data.ecoidLinked); }).catch(() => setInbox([]));
  }, []);
  useEffect(() => { loadInbox(); }, [loadInbox]);

  const emailSubject = (ref, subj) => `[${APP_CODE}] #${ref} ${subj}`;
  const openEmail = (ref, subj, desc) => {
    const lines = [desc || '(no description)', '', '---', `ticket_ref: ${ref}`, `app_code: ${APP_CODE}`, `account: ${user?.email || ''}`, `subject: ${subj}`].join('\n');
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(emailSubject(ref, subj))}&body=${encodeURIComponent(lines)}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) { setError('Please add a subject.'); return; }
    setSending(true); setError(''); setResult(null);
    const subj = subject.trim(); const desc = body.trim();
    try {
      const { data } = await api.post('/support/ticket', { subject: subj, body: desc });
      setResult({ ...data, subject: subj }); setSubject(''); setBody(''); loadInbox();
      openEmail(data.ticketRef, subj, desc);
    } catch (e2) { setError(errMsg(e2, 'We could not record your request. You can still email us directly.')); }
    finally { setSending(false); }
  };

  return (
    <div style={{ maxWidth: 780 }}>
      <PageHead title="Help & Support" subtitle="Tell us what you need. A human support agent reviews every request." />
      {linked === false && (
        <Notice type="ok">
          Your account isn't linked to EcoID yet, so requests are sent by email to {SUPPORT_EMAIL} and replies come by email.{' '}
          <Link to="/account/ecoid">Link your EcoID</Link> to also send requests directly from Worker and see replies here.
        </Notice>
      )}
      <div style={box}>
        <Notice type="err">{error}</Notice>
        {result && (
          <Notice type="ok">
            <strong>Request recorded — reference {result.ticketRef}.</strong>{' '}
            {result.ecobusDelivered
              ? 'It was sent securely to our support team, and your email app opened with a copy — whichever reaches us first.'
              : 'Your email app should have opened with your request to our support team. Please press Send.'}
            <div style={{ marginTop: 6, fontSize: '0.82rem' }}>
              Email not opening? Send it to <strong>{SUPPORT_EMAIL}</strong> with the subject <code>{emailSubject(result.ticketRef, result.subject)}</code>.
            </div>
          </Notice>
        )}
        <form onSubmit={submit}>
          <div className="field"><label>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={240} placeholder="e.g. My M-Pesa payment did not activate our subscription" required /></div>
          <div className="field"><label>Description</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={6} style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="Describe what happened, what you expected, and any reference numbers (e.g. M-Pesa receipt, invoice number)." /></div>
          <button className="btn" disabled={sending}>{sending ? <span className="spinner" /> : 'Send request'}</button>
          <p className="muted" style={{ fontSize: '0.78rem', marginBottom: 0 }}>
            {linked ? 'Sends over our secure event bus and also opens an email to our support team.' : `Opens an email to ${SUPPORT_EMAIL} with your reference number.`}
          </p>
        </form>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem' }}>
        <h3 style={{ margin: 0 }}>Support inbox</h3>
        <button type="button" className="btn secondary sm" onClick={loadInbox}>Refresh</button>
      </div>
      {inbox === null && <span className="spinner" />}
      {inbox && inbox.length === 0 && <p className="muted">No requests yet.</p>}
      {inbox && inbox.map((t) => (
        <div key={t.ticketRef} style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div><strong>{t.subject}</strong><div className="muted" style={{ fontSize: '0.8rem' }}>{t.ticketRef} · {fmt(t.createdAt)}</div></div>
            <span className={`badge ${t.status === 'resolved' ? 'green' : ''}`}>{t.status === 'resolved' ? 'Resolved' : 'Open'}</span>
          </div>
          {t.status === 'resolved' && t.resolution && (
            <div style={{ marginTop: 10, padding: '0.75rem', borderRadius: 8, background: 'rgba(128,128,128,0.08)', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
              {t.resolution}{t.resolvedAt && <div className="muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>Resolved {fmt(t.resolvedAt)}</div>}
            </div>
          )}
          {t.status !== 'resolved' && t.channel === 'EMAIL' && <div className="muted" style={{ marginTop: 8, fontSize: '0.8rem' }}>Sent by email — replies come to your email.</div>}
        </div>
      ))}
    </div>
  );
}
