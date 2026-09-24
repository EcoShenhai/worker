import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function Landing() {
  const { t } = useI18n();
  const features = ['f1', 'f2', 'f3', 'f4'];
  const steps = ['s1', 's2', 's3', 's4'];
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
          <LanguageSwitcher />
          <Link className="btn secondary sm" to="/login">{t('common.signIn')}</Link>
          <Link className="btn sm" to="/register">{t('common.createAccount')}</Link>
        </div>
      </nav>

      <header className="lp-hero">
        <h1>{t('landing.hero.title')}</h1>
        <p>{t('landing.hero.body')}</p>
        <div className="cta">
          <Link className="btn" to="/register">{t('common.getStarted')}</Link>
          <Link className="btn secondary" to="/login">{t('common.signIn')}</Link>
        </div>
        <div className="badge-row">{t('landing.hero.badgeRow')}</div>
      </header>

      <section className="lp-section">
        <h2>{t('landing.what.title')}</h2>
        <p className="lead">{t('landing.what.lead')}</p>
        <div className="lp-grid">
          {features.map((f, i) => (
            <div className="lp-card" key={f}><div className="ic">{i + 1}</div><h3>{t(`landing.what.${f}.title`)}</h3><p>{t(`landing.what.${f}.body`)}</p></div>
          ))}
        </div>
      </section>

      <section className="lp-section" style={{ paddingTop: 0 }}>
        <h2>{t('landing.start.title')}</h2>
        <p className="lead">{t('landing.start.lead')}</p>
        <div className="lp-steps">
          {steps.map((s, i) => (
            <div className="lp-step" key={s}><div className="n">{i + 1}</div><h3>{t(`landing.start.${s}.title`)}</h3><p>{t(`landing.start.${s}.body`)}</p></div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-pricing" style={{ paddingTop: 3.5 }}>
        <h2>{t('landing.pricing.title')}</h2>
        <p className="lead">{t('landing.pricing.lead')}</p>
        <div className="lp-grid">
          <div className="lp-card">
            <h3>{t('landing.pricing.starter.name')}</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, margin: '.35rem 0' }}>$10<span style={{ fontSize: '.85rem', fontWeight: 400, color: 'var(--muted)' }}>{t('landing.pricing.perMonth')}</span></div>
            <p>{t('landing.pricing.starter.desc')}</p>
            <div style={{ marginTop: '1rem' }}>
              <Link className="btn sm" to="/register">{t('common.startFreeTrial')}</Link>
            </div>
          </div>
          <div className="lp-card" style={{ borderColor: 'var(--primary)' }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '.35rem' }}>{t('landing.pricing.mostPopular')}</div>
            <h3>{t('landing.pricing.professional.name')}</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, margin: '.35rem 0' }}>$20<span style={{ fontSize: '.85rem', fontWeight: 400, color: 'var(--muted)' }}>{t('landing.pricing.perMonth')}</span></div>
            <p>{t('landing.pricing.professional.desc')}</p>
            <div style={{ marginTop: '1rem' }}>
              <Link className="btn sm" to="/register">{t('common.startFreeTrial')}</Link>
            </div>
          </div>
          <div className="lp-card">
            <h3>{t('landing.pricing.premium.name')}</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, margin: '.35rem 0' }}>$50<span style={{ fontSize: '.85rem', fontWeight: 400, color: 'var(--muted)' }}>{t('landing.pricing.perMonth')}</span></div>
            <p>{t('landing.pricing.premium.desc')}</p>
            <div style={{ marginTop: '1rem' }}>
              <Link className="btn sm" to="/register">{t('common.startFreeTrial')}</Link>
            </div>
          </div>
        </div>
        <p className="lead" style={{ marginTop: '1.4rem', marginBottom: 0, fontSize: '.85rem' }}>{t('landing.pricing.paymentsNote')}</p>
      </section>

      <section className="lp-final">
        <h2>{t('landing.final.title')}</h2>
        <Link className="btn" to="/register">{t('landing.final.cta')}</Link>
      </section>

      <footer className="lp-foot">
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', lineHeight: 1.5 }}>
          <div><strong>Worker AI Administrative Workplace</strong></div>
          <div>© 2026 Shenhai Enterprises Limited · theshenhai.com · worker@theshenhai.com</div>
          <div>Worker generates administrative documents; authorized users remain responsible for review and approval.</div>
        </div>
      </footer>
    </div>
  );
}
