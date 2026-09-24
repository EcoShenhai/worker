import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';
import { PageHead, StatusBadge, Empty, Notice, useLabel } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function SessionDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const label = useLabel();
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
      setMsg({ type: 'err', text: t('session.loadFailed') });
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
      setMsg({ type: 'err', text: t('session.micDenied') });
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
      setMsg({ type: 'ok', text: t('session.audioSaved') });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('session.uploadFailed') });
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
    setMsg({ type: 'warn', text: t('session.transcribing') });
    try {
      await api.post(`/recordings/${recId}/transcribe`);
      setMsg({ type: 'ok', text: t('session.transcribed') });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('session.transcribeFailed') });
    } finally {
      setBusy('');
    }
  };

  const toggleInclude = async (recId, val) => {
    try {
      await api.patch(`/recordings/${recId}/include`, { includeInMinutes: val });
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('session.updateFailed') });
    }
  };

  const generateMinutes = async () => {
    setBusy('minutes');
    setMsg({ type: 'warn', text: t('session.draftingMinutes') });
    try {
      const { data } = await api.post(`/sessions/${id}/minutes`);
      const doc = data.document || data;
      setMsg({ type: 'ok', text: t('session.minutesCreated') });
      navigate(`/documents/${doc.id}`);
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('session.minutesFailed') });
      setBusy('');
    }
  };

  const DOC_TYPES = ['minutes', 'memo', 'letter', 'report', 'policy_brief', 'briefing_note', 'concept_note', 'circular', 'action_matrix', 'speech'];
  const [genType, setGenType] = useState('minutes');
  const [genNote, setGenNote] = useState('');
  const typeLabel = (x) => {
    const key = `docType.${x}`;
    const s = t(key);
    const txt = s && s !== key ? s : x.replace(/_/g, ' ');
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  };
  const generateDocument = async () => {
    setBusy('generate');
    setMsg({ type: 'warn', text: t('generate.working') });
    try {
      const { data } = await api.post(`/sessions/${id}/generate`, { type: genType, instructions: genNote });
      const doc = data.document || data;
      setMsg({ type: 'ok', text: t('generate.done') });
      navigate(`/documents/${doc.id}`);
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.message || t('generate.failed') });
      setBusy('');
    }
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;
  if (!session) return <Empty>{t('session.notFound')}</Empty>;

  const recordings = session.recordings || [];
  const hasTranscript = recordings.some((r) => r.status === 'transcribed' || r.transcript);

  return (
    <>
      <PageHead
        title={session.title}
        subtitle={`${label('kind', session.kind)} · ${session.occurredOn || t('session.noDate')} · ${session.location || t('session.noLocation')}`}
        actions={
          <>
            {hasTranscript && <button className="btn" onClick={generateMinutes} disabled={busy === 'minutes'}>{busy === 'minutes' ? <span className="spinner" /> : t('session.generateMinutes')}</button>}
            <Link className="btn secondary" to="/sessions">{t('common.back')}</Link>
          </>
        }
      />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      {hasTranscript && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-head"><h3>{t('generate.title')}</h3></div>
          <div className="card-body">
            <div className="grid cols-2">
              <div className="field"><label>{t('generate.as')}</label>
                <select value={genType} onChange={(e) => setGenType(e.target.value)}>
                  {DOC_TYPES.map((x) => <option key={x} value={x}>{typeLabel(x)}</option>)}
                </select>
              </div>
              <div className="field"><label>{t('generate.instructions')}</label>
                <input value={genNote} maxLength={2000} onChange={(e) => setGenNote(e.target.value)} placeholder={t('generate.placeholder')} />
              </div>
            </div>
            <button className="btn" onClick={generateDocument} disabled={busy === 'generate'}>{busy === 'generate' ? <span className="spinner" /> : t('generate.button')}</button>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.6rem', marginBottom: 0 }}>{t('generate.hint')}</p>
          </div>
        </div>
      )}

      <div className="grid cols-2" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <div className="card-head"><h3>{t('session.captureAudio')}</h3><StatusBadge value={session.status} /></div>
          <div className="card-body">
            <div className="recorder">
              {recording ? (
                <>
                  <span className="rec-dot" />
                  <span className="mono">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
                  <button className="btn danger sm" onClick={stopRec}>{t('session.stopSave')}</button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={startRec} disabled={busy === 'upload'}>{t('session.startRecording')}</button>
                  <span className="muted">{t('session.or')}</span>
                  <label className="btn secondary sm" style={{ margin: 0 }}>
                    {t('session.uploadAudio')}
                    <input type="file" accept="audio/*" onChange={onFile} style={{ display: 'none' }} />
                  </label>
                </>
              )}
              {busy === 'upload' && <span className="spinner" />}
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.8rem', marginBottom: 0 }}>
              {t('session.audioNote')}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>{t('session.documentsFrom')}</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {session.documents?.length ? (
              <table>
                <tbody>
                  {session.documents.map((d) => (
                    <tr key={d.id}>
                      <td><Link to={`/documents/${d.id}`}>{d.title}</Link><div className="muted" style={{ fontSize: '0.76rem' }}>{label('docType', d.type)}</div></td>
                      <td style={{ textAlign: 'right' }}><StatusBadge value={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Empty>{t('session.noDocuments')}</Empty>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>{t('session.recordingsTitle')}</h3><span className="muted" style={{ fontSize: '0.82rem' }}>{t(recordings.length === 1 ? 'session.clipOne' : 'session.clipMany', { n: recordings.length })}</span></div>
        <div className="card-body">
          {recordings.length === 0 ? (
            <Empty>{t('session.noRecordings')}</Empty>
          ) : (
            <div className="stack">
              {recordings.map((r) => (
                <div key={r.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1rem', opacity: r.includeInMinutes === false ? 0.6 : 1 }}>
                  <div className="between" style={{ marginBottom: '0.6rem' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.originalFilename || r.source}</div>
                      <div className="muted" style={{ fontSize: '0.76rem' }}>{r.durationSeconds ? `${r.durationSeconds}s · ` : ''}{r.mimeType}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', margin: 0, fontWeight: 500, color: 'var(--ink-soft)', cursor: 'pointer' }} title={t('session.includeTitle')}>
                        <input type="checkbox" style={{ width: 'auto' }} checked={r.includeInMinutes !== false} onChange={(e) => toggleInclude(r.id, e.target.checked)} />
                        {t('session.inMinutes')}
                      </label>
                      <StatusBadge value={r.status} />
                      {r.status !== 'transcribed' && (
                        <button className="btn secondary sm" onClick={() => transcribe(r.id)} disabled={busy === 'tx-' + r.id}>
                          {busy === 'tx-' + r.id ? <span className="spinner" /> : t('session.transcribe')}
                        </button>
                      )}
                    </div>
                  </div>

                  <AudioPlayer recordingId={r.id} filename={(r.originalFilename || r.source || 'recording') + '.webm'} />

                  <div style={{ marginTop: '0.8rem' }}>
                    {r.transcript ? (
                      <TranscriptView transcript={r.transcript} onSaved={load} />
                    ) : (
                      <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>{t('session.transcribeHint')}</p>
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
  const { t } = useI18n();
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
      setErr(t('session.audioLoadFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <audio controls src={url} style={{ height: 36, maxWidth: '100%' }} />
        <a className="btn ghost sm" href={url} download={filename}>{t('common.download')}</a>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <button className="btn secondary sm" onClick={loadAudio} disabled={busy}>{busy ? <span className="spinner" /> : t('session.loadAudio')}</button>
      {err && <span className="muted" style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{err}</span>}
    </div>
  );
}

function TranscriptView({ transcript, onSaved }) {
  const { t } = useI18n();
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
          {transcript.provider} · {t('session.words', { n: transcript.wordCount || 0 })} {transcript.verified && '· ' + t('session.verified')}
        </span>
        {!editing && <button className="btn ghost sm" onClick={() => setEditing(true)}>{t('session.editVerify')}</button>}
      </div>
      {editing ? (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 160 }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
            <button className="btn sm" onClick={() => save(true)} disabled={busy}>{t('session.saveVerified')}</button>
            <button className="btn secondary sm" onClick={() => save(false)} disabled={busy}>{t('session.saveDraft')}</button>
            <button className="btn ghost sm" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
          </div>
        </>
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.6, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '0.7rem' }}>
          {text || <span className="muted">{t('session.emptyTranscript')}</span>}
        </div>
      )}
    </div>
  );
}
