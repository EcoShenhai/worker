import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

export default function Landing() {
  return (
    <div className="lp">
      <style>{`
        .lp { min-height:100vh; background:#fff; color:var(--ink); }
        .lp a { text-decoration:none; }
        .lp-nav { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem; max-width:1080px; margin:0 auto; }
        .lp-brand { display:flex; align-items:center; gap:.55rem; }
        .lp-brand .wm { font-family:var(--serif); font-size:1.5rem; font-weight:500; }
        .lp-nav .cta { display:flex; gap:.6rem; align-items:center; }
        .lp-hero { background:radial-gradient(1100px 460px at 50% -12%, #0f2a21 0%, #0b1f19 55%, #0a1c17 100%); color:#eaf3ee; padding:4.5rem 1.5rem 4rem; text-align:center; }
        .lp-hero h1 { font-family:var(--serif); font-weight:500; font-size:2.6rem; line-height:1.12; margin:0 auto .8rem; max-width:800px; color:#fff; }
        .lp-hero p { font-size:1.12rem; color:#bcd6c9; max-width:640px; margin:0 auto 1.6rem; }
        .lp-hero .cta { display:flex; gap:.8rem; justify-content:center; flex-wrap:wrap; }
        .lp-hero .badge-row { margin-top:1.6rem; font-size:.82rem; color:#8fb3a4; }
        .lp-section { max-width:1080px; margin:0 auto; padding:3.5rem 1.5rem; }
        .lp-section h2 { font-family:var(--serif); font-weight:500; font-size:1.8rem; text-align:center; margin-bottom:.4rem; }
        .lp-section .lead { text-align:center; color:var(--muted); max-width:620px; margin:0 auto 2.2rem; }
        .lp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; }
        .lp-card { border:1px solid var(--line); border-radius:12px; padding:1.3rem; background:var(--surface-2); }
        .lp-card .ic { width:40px; height:40px; border-radius:10px; background:var(--primary-tint); color:var(--primary-dark); display:grid; place-items:center; font-weight:700; font-family:var(--serif); font-size:1.2rem; margin-bottom:.7rem; }
        .lp-card h3 { font-size:1rem; margin:0 0 .3rem; }
        .lp-card p { font-size:.9rem; color:var(--muted); margin:0; line-height:1.5; }
        .lp-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; counter-reset:s; }
        .lp-step { padding:1.2rem; border-radius:12px; border:1px solid var(--line); position:relative; }
        .lp-step .n { width:30px; height:30px; border-radius:50%; background:var(--primary); color:#fff; display:grid; place-items:center; font-weight:700; margin-bottom:.6rem; }
        .lp-step h3 { font-size:.98rem; margin:0 0 .25rem; }
        .lp-step p { font-size:.88rem; color:var(--muted); margin:0; line-height:1.5; }
        .lp-band { background:var(--primary-tint); border-top:1px solid #cfe6db; border-bottom:1px solid #cfe6db; }
        .lp-band .inner { max-width:1080px; margin:0 auto; padding:2rem 1.5rem; text-align:center; color:var(--primary-dark); font-size:.98rem; }
        .lp-final { text-align:center; padding:3.5rem 1.5rem; }
        .lp-final h2 { font-family:var(--serif); font-weight:500; font-size:1.9rem; margin-bottom:1.1rem; }
        .lp-foot { border-top:1px solid var(--line); padding:1.6rem 1.5rem; text-align:center; color:var(--muted); font-size:.82rem; }
        @media (max-width:820px){ .lp-grid,.lp-steps{ grid-template-columns:1fr 1fr; } .lp-hero h1{ font-size:2rem; } }
        @media (max-width:520px){ .lp-grid,.lp-steps{ grid-template-columns:1fr; } }
      `}</style>

      <nav className="lp-nav">
        <div className="lp-brand"><Logo size={32} /><span className="wm">Worker</span></div>
        <div className="cta">
          <Link className="btn secondary sm" to="/login">Sign in</Link>
          <Link className="btn sm" to="/register">Create account</Link>
        </div>
      </nav>

      <header className="lp-hero">
        <h1>Turn what you say into finished, filed paperwork.</h1>
        <p>Worker is an AI administrative assistant for government and public offices. Record a meeting or dictate, and it transcribes, drafts the minutes, memos, letters, reports and briefs, and routes them for review and approval — with a full audit trail.</p>
        <div className="cta">
          <Link className="btn" to="/register">Get started</Link>
          <Link className="btn secondary" to="/login">Sign in</Link>
        </div>
        <div className="badge-row">Audio · English · Secure workspace</div>
      </header>

      <section className="lp-section">
        <h2>What Worker does</h2>
        <p className="lead">The routine office work that surrounds meetings and correspondence — handled in minutes, not hours.</p>
        <div className="lp-grid">
          <div className="lp-card"><div className="ic">1</div><h3>Record &amp; transcribe</h3><p>Capture meetings, interviews, briefings or dictation. Audio is transcribed locally in English.</p></div>
          <div className="lp-card"><div className="ic">2</div><h3>Draft with AI</h3><p>Generate minutes, memos, letters, reports, policy briefs and circulars in correct official form.</p></div>
          <div className="lp-card"><div className="ic">3</div><h3>Review &amp; approve</h3><p>Every document moves through draft, review, approval and finalisation — people stay in control.</p></div>
          <div className="lp-card"><div className="ic">4</div><h3>Secure &amp; audited</h3><p>Role-based access and a complete audit trail. Correspondence is only ever sent by a person.</p></div>
        </div>
      </section>

      <section className="lp-section" style={{ paddingTop: 0 }}>
        <h2>Getting started takes a minute</h2>
        <p className="lead">Create an account today — you can use a Gmail or Yahoo address to begin.</p>
        <div className="lp-steps">
          <div className="lp-step"><div className="n">1</div><h3>Create your account</h3><p>Enter your name, email and a password.</p></div>
          <div className="lp-step"><div className="n">2</div><h3>Verify your email</h3><p>Enter the 6-digit code we email you.</p></div>
          <div className="lp-step"><div className="n">3</div><h3>Sign in securely</h3><p>Each sign-in confirms with a one-time emailed code.</p></div>
          <div className="lp-step"><div className="n">4</div><h3>Start working</h3><p>Create a session, record, and generate your first document.</p></div>
        </div>
      </section>

      <div className="lp-band"><div className="inner">Flexible for every office — from national departments to county governments. M-Pesa and PayPal are enabled.</div></div>

      <section className="lp-final">
        <h2>Ready to try Worker?</h2>
        <Link className="btn" to="/register">Create your account</Link>
      </section>

      <footer className="lp-foot">Worker — AI administrative workplace agent · worker.eshcloud.com</footer>
    </div>
  );
}
