import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { PageHead, StatusBadge, Empty, Notice } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function Emails() {
  const { t } = useI18n();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ toAddress: '', cc: '', subject: '', body: '', intent: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/emails');
      setEmails(data.emails || data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const aiDraft = async () => {
    if (!form.intent && !form.subject) return setMsg({ type: 'err', text: t('emails.needIntent') });
    setBusy('ai');
    try {
      const { data } = await api.post('/emails/ai-draft', { toAddress: form.toAddress, subject: form.subject, intent: form.intent || form.subject });
      const d = data.email || data;
      setForm({ ...form, subject: d.subject || form.subject, body: d.body || d.finalEditedBody || '' });
      setMsg({ type: 'ok', text: t('emails.draftReady') });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('emails.draftFailed') });
    } finally {
      setBusy('');
    }
  };

  const saveDraft = async () => {
    setBusy('save');
    try {
      const { data } = await api.post('/emails', { toAddress: form.toAddress, cc: form.cc, subject: form.subject, body: form.body });
      setSelected(data.email || data);
      setComposing(false);
      setMsg({ type: 'ok', text: t('emails.draftSaved') });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('emails.saveFailed') });
    } finally {
      setBusy('');
    }
  };

  const send = async (emailId) => {
    if (!confirm(t('emails.confirmSend'))) return;
    setBusy('send');
    try {
      await api.post(`/emails/${emailId}/send`);
      setMsg({ type: 'ok', text: t('emails.sent') });
      setSelected(null);
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('emails.sendFailed') });
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHead
        title={t('nav.correspondence')}
        subtitle={t('emails.subtitle')}
        actions={<button className="btn" onClick={() => { setComposing(true); setSelected(null); }}>{t('emails.compose')}</button>}
      />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}

      <div className="grid cols-2">
        <div className="card">
          <div className="card-head"><h3>{t('emails.messages')}</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div className="empty"><span className="spinner" /></div> : emails.length === 0 ? (
              <Empty>{t('emails.empty')}</Empty>
            ) : (
              <table>
                <tbody>
                  {emails.map((e) => (
                    <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => { setSelected(e); setComposing(false); }}>
                      <td><div>{e.subject}</div><div className="muted" style={{ fontSize: '0.78rem' }}>{e.toAddress}</div></td>
                      <td style={{ textAlign: 'right' }}><StatusBadge value={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>{composing ? t('emails.compose') : selected ? t('emails.message') : t('emails.details')}</h3></div>
          <div className="card-body">
            {composing ? (
              <>
                <div className="field"><label>{t('emails.to')}</label><input value={form.toAddress} onChange={(e) => setForm({ ...form, toAddress: e.target.value })} /></div>
                <div className="field"><label>{t('emails.cc')}</label><input value={form.cc} onChange={(e) => setForm({ ...form, cc: e.target.value })} /></div>
                <div className="field"><label>{t('emails.subject')}</label><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                <div className="field"><label>{t('emails.intent')}</label><input value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value })} placeholder={t('emails.intentPlaceholder')} /></div>
                <button className="btn secondary sm" onClick={aiDraft} disabled={busy === 'ai'}>{busy === 'ai' ? <span className="spinner" /> : t('documents.draftWithAI')}</button>
                <div className="field" style={{ marginTop: '1rem' }}><label>{t('emails.body')}</label><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ minHeight: 200 }} /></div>
                <button className="btn" onClick={saveDraft} disabled={busy === 'save'}>{t('emails.saveDraft')}</button>
              </>
            ) : selected ? (
              <>
                <div className="stack" style={{ gap: '0.4rem', marginBottom: '1rem' }}>
                  <div><span className="muted">{t('emails.toLabel')}</span> {selected.toAddress}</div>
                  {selected.cc && <div><span className="muted">{t('emails.ccLabel')}</span> {selected.cc}</div>}
                  <div><span className="muted">{t('emails.subjectLabel')}</span> {selected.subject}</div>
                  <div><StatusBadge value={selected.status} /> {selected.aiAssisted && <span className="badge blue">{t('emails.aiAssisted')}</span>}</div>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.6, borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                  {selected.finalEditedBody || selected.body}
                </div>
                {selected.status === 'draft' && (
                  <button className="btn" style={{ marginTop: '1rem' }} onClick={() => send(selected.id)} disabled={busy === 'send'}>
                    {busy === 'send' ? <span className="spinner" /> : t('emails.sendNow')}
                  </button>
                )}
              </>
            ) : (
              <Empty>{t('emails.selectHint')}</Empty>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
