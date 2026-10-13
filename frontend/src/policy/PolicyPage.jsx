import React, { useEffect, useState } from 'react'; // React in scope for apps built with the classic JSX runtime
import { renderGuide } from './policyMarkdown';

// Public policy page (no sign-in), shared by EcoID and EcoPay (2026-10-13). Single source: a Markdown file under
// /docs, the same file the Word version is built from. <PolicyPage src="/docs/refund-policy.md" docx="..." home="/" app="EcoID" />
const CSS = `
.pp-page{max-width:1180px;margin:0 auto;padding:20px 16px 48px;line-height:1.55;font-size:16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1F2D3D;background:#fff;border-radius:8px}
.pp-wrap{background:#fff;min-height:100vh}
.pp-head{border-bottom:3px solid #1F7A6E;padding-bottom:12px;margin-bottom:20px}
.pp-head h1{margin:0;font-size:2rem;color:#1F2D3D;font-family:inherit}.pp-head .sub{color:#1F7A6E;font-size:1.1rem;margin:4px 0}
.pp-head .meta{color:#666;font-size:.85rem}
.pp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.pp-actions a,.pp-actions button{border:1px solid #1F7A6E;color:#1F7A6E;background:#fff;border-radius:6px;padding:8px 12px;min-height:40px;box-sizing:border-box;display:inline-flex;align-items:center;text-decoration:none;cursor:pointer;font:inherit;font-size:.9rem}
.pp-actions .primary{background:#1F7A6E;color:#fff}
.pp-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px}
.pp-toc{position:sticky;top:12px;align-self:start;max-height:92vh;overflow:auto;font-size:.88rem;border-inline-end:1px solid #e5e5e5;padding-inline-end:12px}
.pp-toc b{color:#1F2D3D}
.pp-toc a{display:block;color:#1F2D3D;text-decoration:none;padding:6px 0}.pp-toc a:hover{color:#1F7A6E}
.pp-toc .l2{padding-inline-start:14px;color:#555}
.pp-body h2{color:#1F2D3D;font-size:1.4rem;border-bottom:2px solid #e6f2f0;padding-bottom:4px;margin:34px 0 10px;scroll-margin-top:12px;font-family:inherit}
.pp-body h3{color:#1F7A6E;font-size:1.1rem;margin:22px 0 8px;scroll-margin-top:12px;font-family:inherit}
.pp-body p{margin:8px 0;color:#1F2D3D}
.pp-body a{color:#1F7A6E}
.pp-body .tbl{overflow-x:auto;margin:10px 0}.pp-body table{border-collapse:collapse;width:100%;font-size:.92rem;background:#fff;color:#1F2D3D}
.pp-body th,.pp-body td{border:1px solid #d0d0d0;padding:6px 8px;text-align:start;vertical-align:top}
.pp-body th{background:#e6f2f0}
.pp-body ol,.pp-body ul{padding-inline-start:24px;margin:8px 0}
.pp-body li{margin:4px 0;color:#1F2D3D}
.pp-body .callout{margin:12px 0;padding:10px 14px;border-inline-start:4px solid #1F7A6E;background:#eef6f4}
.pp-body .callout p{margin:0}
.pp-err{color:#b00020}
@media (max-width:820px){.pp-grid{grid-template-columns:minmax(0,1fr)}.pp-toc{position:static;max-height:none;border-inline-end:0;border-bottom:1px solid #e5e5e5;padding-bottom:10px}}
@media print{.pp-toc,.pp-actions{display:none}.pp-grid{display:block}.pp-page{max-width:none;padding:0}.pp-body h2{break-after:avoid}.pp-body tr,.pp-body .callout{break-inside:avoid}}
`;

export default function PolicyPage({ src = '/docs/refund-policy.md', docx = '/docs/Refund_and_Cancellation_Policy.docx', home = '/', app = 'the app' }) {
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    fetch(src, { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((md) => { if (/^\s*<!doctype html/i.test(md)) throw new Error('policy file not found'); setDoc(renderGuide(md)); })
      .catch((e) => setErr(String(e.message || e)));
  }, [src]);
  useEffect(() => {
    if (!doc) return;
    if (doc.meta.title) document.title = doc.meta.title;
    if (window.location.hash) { const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); if (el) el.scrollIntoView(); }
  }, [doc]);
  const m = (doc && doc.meta) || {};
  return (
    <div className="pp-wrap" lang="en" dir="ltr">
      <style>{CSS}</style>
      <div className="pp-page">
        <header className="pp-head">
          <h1>{m.title || 'Refund and Cancellation Policy'}</h1>
          {m.subtitle && <div className="sub">{m.subtitle}</div>}
          <div className="meta">{[m.author, m.date].filter(Boolean).join(' · ')}</div>
          <div className="pp-actions">
            <a className="primary" href={docx} download>Download the Word version</a>
            <button type="button" onClick={() => window.print()}>Print</button>
            <a href={home}>Back to {app}</a>
          </div>
        </header>
        {err && <p className="pp-err">The policy could not be loaded ({err}). Please try again, or write to support@theshenhai.com.</p>}
        {doc && (
          <div className="pp-grid">
            <nav className="pp-toc" aria-label="Contents">
              <b>Contents</b>
              {doc.toc.map((x) => <a key={x.id} href={`#${x.id}`} className={x.level === 2 ? 'l2' : ''}>{x.text}</a>)}
            </nav>
            {/* Content is escaped by renderGuide before any markup is added. */}
            <article className="pp-body" dangerouslySetInnerHTML={{ __html: doc.html }} />
          </div>
        )}
      </div>
    </div>
  );
}
