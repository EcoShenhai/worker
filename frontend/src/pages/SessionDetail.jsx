import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead, StatusBadge, Empty, Notice } from '../components/ui.jsx';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get(`/sessions/${id}`);
      setSession(data.session || data);
    } catch {
      setMsg({ type: 'err', text: 'Could not load session.' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // ---- Recorder ----
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRec = async () => {
    setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        await uploadBlob(blob, `recording-${Date.now()}.webm`, 'recorded');
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setMsg({ type: 'err', text: 'Microphone access denied or unavailable.' });
    }
  };
  const stopRec = () => {
    mediaRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const uploadBlob = async (blob, filename, source) => {
    setBusy('upload');
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('source', source);
    try {
      await api.post(`/sessions/${id}/recordings`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ type: 'ok', text: 'Audio saved to the session.' });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Upload failed.' });
    } finally {
      setBusy('');
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) uploadBlob(f, f.name, 'uploaded');
    e.target.value = '';
  };

  const transcribe = async (recId) => {
    setBusy('tx-' + recId);
    setMsg({ type: 'warn', text: 'Transcribing locally — this can take a moment for longer audio.' });
    try {
      await api.post(`/recordings/${recId}/transcribe`);
      setMsg({ type: 'ok', text: 'Transcription complete.' });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Transcription failed. Check the STT service is running.' });
    } finally {
      setBusy('');
    }
  };

  const generateMinutes = async () => {
    setBusy('minutes');
    setMsg({ type: 'warn', text: 'Drafting minutes from the transcript…' });
    try {
      const { data } = await api.post(`/sessions/${id}/minutes`);
      const doc = data.document || data;
      setMsg({ type: 'ok', text: 'Draft minutes created.' });
      navigate(`/documents/${doc.id}`);
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Could not generate minutes.' });
      setBusy('');
    }
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;
  if (!session) return <Empty>Session not found.</Empty>;

  const recordings = session.recordings || [];
  const hasTranscript = recordings.some((r) => r.status === 'transcribed' || r.transcript);

  return (
    <>
      <PageHead
        title={session.title}
        subtitle={`${session.kind.replace(/_/g, ' ')} · ${session.occurredOn || 'no date'} · ${session.location || 'no location'}`}
        actions={
          <>
            {hasTranscript && <button className="btn" onClick={generateMinutes} disabled={busy === 'minutes'}>{busy === 'minutes' ? <span className="spinner" /> : 'Generate minutes'}</button>}
            <Link className="btn secondary" to="/sessions">Back</Link>
          </>
        }
      />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}

      <div className="grid cols-2" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <div className="card-head"><h3>Capture audio</h3><StatusBadge value={session.status} /></div>
          <div className="card-body">
            <div className="recorder">
              {recording ? (
                <>
                  <span className="rec-dot" />
                  <span className="mono">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
                  <button className="btn danger sm" onClick={stopRec}>Stop &amp; save</button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={startRec} disabled={busy === 'upload'}>Start recording</button>
                  <span className="muted">or</span>
                  <label className="btn secondary sm" style={{ margin: 0 }}>
                    Upload audio
                    <input type="file" accept="audio/*" onChange={onFile} style={{ display: 'none' }} />
                  </label>
                </>
              )}
              {busy === 'upload' && <span className="spinner" />}
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.8rem', marginBottom: 0 }}>
              Audio stays on the host. Transcription runs locally in English. Minutes combine every clip in this session, in order.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Documents from this session</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {session.documents?.length ? (
              <table>
                <tbody>
                  {session.documents.map((d) => (
                    <tr key={d.id}>
                      <td><Link to={`/documents/${d.id}`}>{d.title}</Link><div className="muted" style={{ fontSize: '0.76rem' }}>{d.type.replace(/_/g, ' ')}</div></td>
                      <td style={{ textAlign: 'right' }}><StatusBadge value={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Empty>No documents yet. Transcribe a clip, then generate minutes.</Empty>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Recordings &amp; transcripts</h3><span className="muted" style={{ fontSize: '0.82rem' }}>{recordings.length} clip{recordings.length === 1 ? '' : 's'}</span></div>
        <div className="card-body">
          {recordings.length === 0 ? (
            <Empty>No recordings yet. Record or upload audio above.</Empty>
          ) : (
            <div className="stack">
              {recordings.map((r) => (
                <div key={r.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                  <div className="between" style={{ marginBottom: '0.6rem' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.originalFilename || r.source}</div>
                      <div className="muted" style={{ fontSize: '0.76rem' }}>{r.durationSeconds ? `${r.durationSeconds}s · ` : ''}{r.mimeType}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StatusBadge value={r.status} />
                      {r.status !== 'transcribed' && (
                        <button className="btn secondary sm" onClick={() => transcribe(r.id)} disabled={busy === 'tx-' + r.id}>
                          {busy === 'tx-' + r.id ? <span className="spinner" /> : 'Transcribe'}
                        </button>
                      )}
                    </div>
                  </div>

                  <AudioPlayer recordingId={r.id} filename={(r.originalFilename || r.source || 'recording') + '.webm'} />

                  <div style={{ marginTop: '0.8rem' }}>
                    {r.transcript ? (
                      <TranscriptView transcript={r.transcript} onSaved={load} />
                    ) : (
                      <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>Transcribe this clip to see and edit its transcript here.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AudioPlayer({ recordingId, filename }) {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const loadAudio = async () => {
    setBusy(true); setErr('');
    try {
      const res = await api.get(`/recordings/${recordingId}/audio`, { responseType: 'blob' });
      setUrl(URL.createObjectURL(res.data));
    } catch {
      setErr('Could not load audio.');
    } finally {
      setBusy(false);
    }
  };

  if (url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <audio controls src={url} style={{ height: 36, maxWidth: '100%' }} />
        <a className="btn ghost sm" href={url} download={filename}>Download</a>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <button className="btn secondary sm" onClick={loadAudio} disabled={busy}>{busy ? <span className="spinner" /> : 'Load audio'}</button>
      {err && <span className="muted" style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{err}</span>}
    </div>
  );
}

function TranscriptView({ transcript, onSaved }) {
  const [text, setText] = useState(transcript.editedText || transcript.rawText || '');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (verified) => {
    setBusy(true);
    try {
      await api.put(`/transcripts/${transcript.id}`, { editedText: text, verified });
      setEditing(false);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="between" style={{ marginBottom: '0.5rem' }}>
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          {transcript.provider} · {transcript.wordCount || 0} words {transcript.verified && '· verified'}
        </span>
        {!editing && <button className="btn ghost sm" onClick={() => setEditing(true)}>Edit &amp; verify</button>}
      </div>
      {editing ? (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 160 }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
            <button className="btn sm" onClick={() => save(true)} disabled={busy}>Save &amp; mark verified</button>
            <button className="btn secondary sm" onClick={() => save(false)} disabled={busy}>Save draft</button>
            <button className="btn ghost sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.6, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '0.7rem' }}>
          {text || <span className="muted">Empty transcript.</span>}
        </div>
      )}
    </div>
  );
}
