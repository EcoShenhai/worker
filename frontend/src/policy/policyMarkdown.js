// Minimal, safe Markdown renderer for Shenhai B2X policy pages (copied from the EcoShopp guide renderer, 2026-10-13).
// Supports: YAML front matter, # ## ### headings (with ids), paragraphs, nested - / 1. lists, GFM tables, > callouts,
// **bold**, *italic*, [links](url). All text is HTML-escaped first, so the file cannot inject markup.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unescapeMd = (s) => s.replace(/\\([*_[\]])/g, '$1').replace(/&amp;quot;/g, '&quot;');
export const slug = (t) => t.toLowerCase().replace(/\*|\\/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const inline = (s) => unescapeMd(esc(s))
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/\[([^\]]+)\]\(((?:https?:\/\/|#|\/)[^)\s]*)\)/g, '<a href="$2">$1</a>');

export function renderGuide(md) {
  const meta = {};
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) { fm[1].split('\n').forEach((l) => { const m = l.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2]; }); md = md.slice(fm[0].length); }
  const L = md.split('\n'); const html = []; const toc = []; let i = 0;
  const isItem = (l) => /^(\s*)([-*]|\d+\.)\s+/.test(l);
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,3})\s+(.*)$/))) {
      const lvl = m[1].length; const text = m[2].trim(); const id = slug(text);
      if (lvl <= 2) toc.push({ level: lvl, text: text.replace(/\*/g, ''), id });
      html.push(`<h${lvl + 1} id="${id}">${inline(text)}</h${lvl + 1}>`); i++; continue;
    }
    if (l.startsWith('|') && L[i + 1] && /^\|[\s:|-]+\|\s*$/.test(L[i + 1])) {
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(l); i += 2; const body = [];
      while (i < L.length && L[i].startsWith('|')) { body.push(cells(L[i])); i++; }
      html.push(`<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (isItem(l)) {
      const items = [];
      while (i < L.length) {
        if (!L[i].trim()) { let j = i; while (j < L.length && !L[j].trim()) j++; if (j < L.length && isItem(L[j])) { i = j; continue; } break; }
        const mm = L[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (mm) { items.push({ indent: mm[1].length, ordered: /\d/.test(mm[2]), text: mm[3] }); i++; }
        else if (/^\s+\S/.test(L[i]) && items.length) { items[items.length - 1].text += ' ' + L[i].trim(); i++; }
        else break;
      }
      // Build nested lists from indentation.
      const base = Math.min(...items.map((x) => x.indent)); const stack = []; let out = '';
      for (const it of items) {
        const lvl = Math.round((it.indent - base) / 4);
        while (stack.length > lvl + 1) out += `</li></${stack.pop()}>`;
        if (stack.length === lvl + 1) out += '</li>';
        while (stack.length < lvl + 1) { const tag = it.ordered ? 'ol' : 'ul'; out += `<${tag}>`; stack.push(tag); }
        out += `<li>${inline(it.text)}`;
      }
      while (stack.length) out += `</li></${stack.pop()}>`;
      html.push(out); continue;
    }
    if (l.startsWith('>')) { // callout
      const q = [];
      while (i < L.length && L[i].startsWith('>')) { q.push(L[i].replace(/^>\s?/, '').trim()); i++; }
      html.push(`<blockquote class="callout"><p>${inline(q.join(' '))}</p></blockquote>`); continue;
    }
    const para = [];
    while (i < L.length && L[i].trim() && !/^(#{1,3})\s/.test(L[i]) && !isItem(L[i]) && !L[i].startsWith('|') && !L[i].startsWith('>')) { para.push(L[i].trim()); i++; }
    html.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return { meta, html: html.join('\n'), toc };
}
