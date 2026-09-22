import { useState } from 'react';
import api from '../api/client.js';
import { PageHead, Notice } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function Assistant() {
  const { t } = useI18n();
  const [instruction, setInstruction] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const ask = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAnswer('');
    setMsg(null);
    try {
      const { data } = await api.post('/workspace/command', { instruction });
      setAnswer(data.result || data.answer || data.output || JSON.stringify(data, null, 2));
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('assistant.failed') });
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title={t('nav.askWorker')} subtitle={t('assistant.subtitle')} />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={ask}>
            <div className="field">
              <label>{t('assistant.instruction')}</label>
              <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} style={{ minHeight: 110 }}
                placeholder={t('assistant.placeholder')} required />
            </div>
            <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : t('assistant.ask')}</button>
          </form>
          {answer && (
            <div style={{ marginTop: '1.5rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, borderTop: '1px solid var(--line)', paddingTop: '1.2rem' }}>
              {answer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
