import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { PageHead, Empty, Notice } from '../components/ui.jsx';

export default function Knowledge() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', extractedText: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/knowledge');
      setItems(data.items || data.documents || data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/knowledge', form);
      setForm({ title: '', category: '', extractedText: '' });
      setMsg({ type: 'ok', text: 'Added to the knowledge base.' });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Could not add.' });
    } finally { setBusy(false); }
  };

  const [file, setFile] = useState(null);
  const [fmeta, setFmeta] = useState({ title: '', category: '' });

  const submitFile = async (e) => {
    e.preventDefault();
    if (!file) return setMsg({ type: 'err', text: 'Choose a file to upload.' });
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (fmeta.title) fd.append('title', fmeta.title);
      if (fmeta.category) fd.append('category', fmeta.category);
      const { data } = await api.post('/knowledge', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.needsOcr) {
        setMsg({ type: 'warn', text: 'File saved. OCR could not read text from this file (it may be low quality). You can paste the text manually.' });
      } else if (data.extractedChars > 0) {
        setMsg({ type: 'ok', text: `File saved and ${data.extractedChars} characters of text extracted.` });
      } else {
        setMsg({ type: 'ok', text: 'File saved. No text could be extracted from this format.' });
      }
      setFile(null); setFmeta({ title: '', category: '' });
      e.target.reset && e.target.reset();
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Upload failed.' });
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!confirm('Remove this reference?')) return;
    await api.delete(`/knowledge/${id}`);
    load();
  };

  return (
    <>
      <PageHead title="Knowledge Base" subtitle="Reference material the assistant can draw on — policies, templates, precedents." />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <div className="grid cols-2">
        <div className="stack">
          <div className="card">
            <div className="card-head"><h3>Upload a document</h3></div>
            <div className="card-body">
              <form onSubmit={submitFile}>
                <div className="field"><label>File</label><input type="file" accept=".txt,.md,.csv,.tsv,.docx,.pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></div>
                <div className="row">
                  <div className="field"><label>Title (optional)</label><input value={fmeta.title} onChange={(e) => setFmeta({ ...fmeta, title: e.target.value })} placeholder="Defaults to file name" /></div>
                  <div className="field"><label>Category (optional)</label><input value={fmeta.category} onChange={(e) => setFmeta({ ...fmeta, category: e.target.value })} /></div>
                </div>
                <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : 'Upload & extract'}</button>
                <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.7rem', marginBottom: 0 }}>
                  Word, PDF, CSV and text files have their text extracted automatically. Scanned PDFs and photos are read automatically with OCR.
                </p>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Add reference (paste text)</h3></div>
            <div className="card-body">
              <form onSubmit={submit}>
                <div className="field"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div className="field"><label>Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Circulars, Policies" /></div>
                <div className="field"><label>Text content</label><textarea value={form.extractedText} onChange={(e) => setForm({ ...form, extractedText: e.target.value })} style={{ minHeight: 140 }} required /></div>
                <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : 'Add'}</button>
              </form>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>References</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div className="empty"><span className="spinner" /></div> : items.length === 0 ? <Empty>Nothing yet.</Empty> : (
              <table><tbody>
                {items.map((k) => (
                  <tr key={k.id}>
                    <td><div>{k.title}</div><div className="muted" style={{ fontSize: '0.78rem' }}>{k.category || 'Uncategorised'}</div></td>
                    <td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => remove(k.id)}>Remove</button></td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
