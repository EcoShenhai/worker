import React, { useState } from 'react';
import { startEcoIdLogin } from '../ecoid/ecoid';
// Connect your existing account on first EcoID sign-in (Shenhai B2X Master Reference §7). One password entry;
// then EcoID (session already active) returns straight away and the normal callback signs you in.
export default function EcoIdConnect() {
  const token = sessionStorage.getItem('ecoid_pending_token');
  let email = null; try { email = JSON.parse(sessionStorage.getItem('ecoid_pending_profile') || '{}').email || null; } catch (e) { email = null; }
  const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/ecoid/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ecoidToken: token, password: pw }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || d.error || d.detail || 'Could not connect your account.');
      sessionStorage.removeItem('ecoid_pending_token'); sessionStorage.removeItem('ecoid_pending_profile'); sessionStorage.removeItem('ecoid_intent');
      await startEcoIdLogin();
    } catch (x) { setErr((x && x.message) || 'Could not connect your account.'); setBusy(false); }
  };
  const wrap = { minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };
  const card = { width: '100%', maxWidth: 440, padding: 28, borderRadius: 12, border: '1px solid rgba(127,127,127,.35)', background: 'rgba(127,127,127,.07)', color: 'inherit' };
  const input = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 8, border: '1px solid rgba(127,127,127,.45)', background: 'transparent', color: 'inherit', fontSize: 15, margin: '6px 0 12px' };
  const btn = { width: '100%', padding: '11px 14px', borderRadius: 8, border: 'none', background: '#2f7d5b', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' };
  const small = { fontSize: 13, opacity: 0.8, marginTop: 14, textAlign: 'center' };
  return (
    <div style={wrap}><div style={card}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>Connect your Worker account</h2>
      {!token ? (<><p>Your EcoID session was not found. Please continue with EcoID again.</p><a href="/login">Back to sign in</a></>) : (
        <form onSubmit={submit}>
          <p style={{ lineHeight: 1.5 }}>An Worker account already uses {email ? <b>{email}</b> : 'your email'}. Enter its password once to connect it to your EcoID. Next time, Continue with EcoID signs you straight in.</p>
          <label style={{ fontSize: 13, opacity: 0.85 }}>Worker password</label>
          <input style={input} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus required autoComplete="current-password" />
          {err && <p style={{ color: '#d33', margin: '0 0 10px' }}>{err}</p>}
          <button style={btn} disabled={busy} type="submit">{busy ? 'Connecting…' : 'Connect and sign in'}</button>
          <p style={small}>Forgot it? Reset it from the <a href="/login">sign-in page</a>.</p>
        </form>)}
    </div></div>
  );
}
