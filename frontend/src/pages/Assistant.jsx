import { useState } from 'react';
import api from '../api/client.js';
import { PageHead, Notice } from '../components/ui.jsx';

export default function Assistant() {
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
      setMsg({ type: 'err', text: e.response?.data?.message || 'The assistant could not process that.' });
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="Ask Worker" subtitle="Give an instruction in plain English — summarise, find, draft or explain across your workspace." />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <div className="card">
        <div className="card-body">
          <form onSubmit={ask}>
            <div className="field">
              <label>Instruction</label>
              <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} style={{ minHeight: 110 }}
                placeholder="e.g. Summarise the decisions from this week's security committee, or list memos still awaiting approval." required />
            </div>
            <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : 'Ask'}</button>
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
