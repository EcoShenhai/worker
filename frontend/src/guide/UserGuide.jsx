import { useEffect, useState } from 'react';
import { renderGuide } from './guideMarkdown';

// Public user guide (no sign-in), shown at /guide by the app router.
// Single source: /docs/user-guide.md (the same file the Word version is built from; see docs/user-guide/README.md).
// Sections can be linked directly for ShenPort campaigns, e.g. https://worker.eshcloud.com/guide#9-make-a-sale
const CSS = `
html,body{background:#fff}
.eg-wrap{background:#fff;min-height:100vh;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.eg-page{max-width:1180px;margin:0 auto;padding:20px 16px 48px;color:#14181c;line-height:1.55;font-size:16px}
.eg-head{border-bottom:3px solid #0b6e4f;padding-bottom:12px;margin-bottom:20px}
.eg-head h1{margin:0;font-size:2rem;color:#14181c}.eg-head .sub{color:#0b6e4f;font-size:1.1rem;margin:4px 0}
.eg-head .meta{color:#666;font-size:.85rem}
.eg-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.eg-actions a,.eg-actions button{border:1px solid #0b6e4f;color:#0b6e4f;background:#fff;border-radius:6px;padding:6px 12px;text-decoration:none;cursor:pointer;font:inherit;font-size:.9rem}
.eg-actions .primary{background:#0b6e4f;color:#fff}
.eg-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px}
.eg-toc{position:sticky;top:12px;align-self:start;max-height:92vh;overflow:auto;font-size:.88rem;border-right:1px solid #e5e5e5;padding-right:12px}
.eg-toc b{color:#14181c}
.eg-toc a{display:block;color:#14181c;text-decoration:none;padding:3px 0}.eg-toc a:hover{color:#0b6e4f}
.eg-toc .l2{padding-left:14px;color:#555}
.eg-body h2{color:#14181c;font-size:1.4rem;border-bottom:2px solid #e8f2ee;padding-bottom:4px;margin:34px 0 10px;scroll-margin-top:12px}
.eg-body h3{color:#0b6e4f;font-size:1.1rem;margin:22px 0 8px;scroll-margin-top:12px}
.eg-body p{margin:8px 0;color:#14181c}
.eg-body a{color:#0b6e4f}
.eg-body .tbl{overflow-x:auto;margin:10px 0}.eg-body table{border-collapse:collapse;width:100%;font-size:.92rem;background:#fff;color:#14181c}
.eg-body th,.eg-body td{border:1px solid #d0d0d0;padding:6px 8px;text-align:left;vertical-align:top}
.eg-body th{background:#e8f2ee}
.eg-body ol,.eg-body ul{padding-left:24px;margin:8px 0}
.eg-body li{margin:4px 0}
.eg-body .callout{margin:12px 0;padding:10px 14px;border-left:4px solid #0b6e4f;background:#eef6f2;border-radius:0 6px 6px 0}
.eg-body .callout p{margin:0}
.eg-err{color:#b00020}
@media (max-width:820px){.eg-grid{grid-template-columns:minmax(0,1fr)}.eg-toc{position:static;max-height:none;border-right:0;border-bottom:1px solid #e5e5e5;padding-bottom:10px}}
@media print{.eg-toc,.eg-actions{display:none}.eg-grid{display:block}.eg-page{max-width:none;padding:0}.eg-body h2{break-after:avoid}.eg-body tr,.eg-body .callout{break-inside:avoid}}
`;

export default function UserGuide({ src = '/docs/user-guide.md', docx = '/docs/Worker_User_Guide.docx' }) {
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    fetch(src, { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((md) => { if (/^\s*<!doctype html/i.test(md)) throw new Error('guide file not found'); setDoc(renderGuide(md)); })
      .catch((e) => setErr(String(e.message || e)));
  }, [src]);
  useEffect(() => {
    if (!doc) return;
    if (doc.meta.title) document.title = doc.meta.title;
    if (window.location.hash) { const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); if (el) el.scrollIntoView(); }
  }, [doc]);
  const m = (doc && doc.meta) || {};
  return (
    <div className="eg-wrap">
      <style>{CSS}</style>
      <div className="eg-page">
        <header className="eg-head">
          <h1>{m.title || 'Worker User Guide'}</h1>
          {m.subtitle && <div className="sub">{m.subtitle}</div>}
          <div className="meta">{[m.author, m.date].filter(Boolean).join(' · ')}</div>
          <div className="eg-actions">
            <a className="primary" href={docx} download>Download Word version</a>
            <button type="button" onClick={() => window.print()}>Print</button>
            <a href="/">Open Worker</a>
          </div>
        </header>
        {err && <p className="eg-err">The guide could not be loaded ({err}). Please refresh the page, or email worker@theshenhai.com.</p>}
        {doc && (
          <div className="eg-grid">
            <nav className="eg-toc" aria-label="Contents">
              <b>Contents</b>
              {doc.toc.map((x) => <a key={x.id} href={`#${x.id}`} className={x.level === 2 ? 'l2' : ''}>{x.text}</a>)}
            </nav>
            {/* Content is escaped by renderGuide before any markup is added. */}
            <article className="eg-body" dangerouslySetInnerHTML={{ __html: doc.html }} />
          </div>
        )}
      </div>
    </div>
  );
}
