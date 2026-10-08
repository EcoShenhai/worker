'use strict';
// Builds Worker_User_Guide.docx from user-guide.md (the single source). Usage: node build-docx.js user-guide.md out.docx
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat, AlignmentType, Footer, PageNumber } = require('docx');

function parse(md) {
  let meta = {};
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) { fm[1].split('\n').forEach((l) => { const m = l.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2]; }); md = md.slice(fm[0].length); }
  const L = md.split('\n'); const out = []; let i = 0;
  const isItem = (l) => /^(\s*)([-*]|\d+\.)\s+/.test(l);
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,3})\s+(.*)$/))) { out.push({ t: 'h', level: m[1].length, text: m[2].trim() }); i++; continue; }
    if (l.startsWith('|') && L[i + 1] && /^\|[\s:|-]+\|\s*$/.test(L[i + 1])) {
      const rows = []; const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      rows.push(cells(l)); i += 2;
      while (i < L.length && L[i].startsWith('|')) { rows.push(cells(L[i])); i++; }
      out.push({ t: 'table', rows }); continue;
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
      out.push({ t: 'list', items }); continue;
    }
    if (l.startsWith('>')) {
      const q = [];
      while (i < L.length && L[i].startsWith('>')) { q.push(L[i].replace(/^>\s?/, '').trim()); i++; }
      out.push({ t: 'quote', text: q.join(' ') }); continue;
    }
    const para = [];
    while (i < L.length && L[i].trim() && !/^(#{1,3})\s/.test(L[i]) && !isItem(L[i]) && !L[i].startsWith('|') && !L[i].startsWith('>')) { para.push(L[i].trim()); i++; }
    out.push({ t: 'p', text: para.join(' ') });
  }
  return { meta, blocks: out };
}

function runs(text, base = {}) {
  const parts = []; const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0; let m;
  const clean = (s) => s.replace(/\\([*_\[\]])/g, '$1').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(new TextRun({ ...base, text: clean(text.slice(last, m.index)) }));
    const tok = m[0];
    parts.push(tok.startsWith('**') ? new TextRun({ ...base, text: clean(tok.slice(2, -2)), bold: true }) : new TextRun({ ...base, text: clean(tok.slice(1, -1)), italics: true }));
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(new TextRun({ ...base, text: clean(text.slice(last)) }));
  return parts;
}

const TEAL = '0B6E4F'; const NAVY = '14181C'; const FONT = 'Calibri';
function build(md) {
  const { meta, blocks } = parse(md);
  const children = [];
  children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: meta.title || 'User Guide', bold: true, size: 48, color: NAVY, font: FONT })] }));
  if (meta.subtitle) children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: meta.subtitle, size: 26, color: TEAL, font: FONT })] }));
  children.push(new Paragraph({ spacing: { after: 360 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 6 } },
    children: [new TextRun({ text: [meta.author, meta.date].filter(Boolean).join(' · '), size: 18, color: '666666', font: FONT })] }));
  let listId = 0;
  const numberingConfigs = [{ reference: 'bullets', levels: [0, 1, 2].map((lvl) => ({ level: lvl, format: LevelFormat.BULLET, text: ['•', '–', '·'][lvl], alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 + lvl * 360, hanging: 360 } } } })) }];
  for (const b of blocks) {
    if (b.t === 'h') children.push(new Paragraph({ heading: b.level === 1 ? HeadingLevel.HEADING_1 : b.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3, keepNext: true, children: runs(b.text) }));
    else if (b.t === 'p') children.push(new Paragraph({ spacing: { after: 120 }, children: runs(b.text) }));
    else if (b.t === 'quote') children.push(new Paragraph({ spacing: { before: 80, after: 160 }, indent: { left: 240, right: 120 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: TEAL, space: 8 } }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EEF6F2' }, children: runs(b.text) }));
    else if (b.t === 'list') {
      const base = Math.min(...b.items.map((x) => x.indent));
      const ref = `num${++listId}`; // fresh numbering instance per list => restarts at 1
      numberingConfigs.push({ reference: ref, levels: [0, 1, 2].map((lvl) => ({ level: lvl, format: lvl === 0 ? LevelFormat.DECIMAL : LevelFormat.LOWER_LETTER, text: `%${lvl + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 + lvl * 360, hanging: 360 } } } })) });
      for (const it of b.items) {
        const level = Math.min(2, Math.round((it.indent - base) / 4));
        children.push(new Paragraph({ spacing: { after: 60 }, numbering: { reference: it.ordered ? ref : 'bullets', level }, children: runs(it.text) }));
      }
    } else if (b.t === 'table') {
      const total = 9026; const n = b.rows[0].length;
      // Column widths: proportional to content (capped), but never narrower than the longest single word, so words do not split.
      const plain = (c) => String(c || '').replace(/\*/g, '');
      const longestWord = (c) => Math.max(0, ...plain(c).split(/[\s/·]+/).map((w) => w.length));
      const weights = b.rows[0].map((_, c) => Math.min(Math.max(...b.rows.map((r) => Math.max(plain(r[c]).length, longestWord(r[c]) * 1.7)), 10), 70));
      const sum = weights.reduce((a, w) => a + w, 0);
      const cols = weights.map((w) => Math.round((w / sum) * total));
      const mins = b.rows[0].map((h, c) => Math.max(...b.rows.map((r) => longestWord(r[c]) * 115), longestWord(h) * 125) + 260);
      for (let c = 0; c < n; c++) { if (cols[c] < mins[c]) { const need = mins[c] - cols[c]; const w = cols.indexOf(Math.max(...cols)); if (w !== c && cols[w] - need > mins[w]) { cols[w] -= need; cols[c] = mins[c]; } } }
      cols[n - 1] = total - cols.slice(0, -1).reduce((a, w) => a + w, 0);
      const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
      children.push(new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: cols,
        rows: b.rows.map((r, ri) => new TableRow({ tableHeader: ri === 0, children: r.map((cell, ci) => new TableCell({
          width: { size: cols[ci], type: WidthType.DXA }, borders: { top: border, bottom: border, left: border, right: border },
          shading: ri === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E8F2EE' } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: runs(cell, ri === 0 ? { bold: true, size: 20 } : { size: 20 }) })] })) })) }));
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    }
  }
  return new Document({
    creator: 'Shenhai Enterprises Limited', title: meta.title || 'User Guide',
    styles: {
      default: { document: { run: { font: FONT, size: 21 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: NAVY, font: FONT }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: TEAL, font: FONT }, paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, color: NAVY, font: FONT }, paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 2 } },
      ],
    },
    numbering: { config: numberingConfigs },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1247, right: 1247 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${meta.title || 'User Guide'} · page `, size: 16, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888' })] })] }) },
      children }],
  });
}

const [, , src = 'user-guide.md', dest = 'Worker_User_Guide.docx'] = process.argv;
Packer.toBuffer(build(fs.readFileSync(src, 'utf8'))).then((buf) => { fs.writeFileSync(dest, buf); console.log(`written ${dest} (${buf.length} bytes)`); });
module.exports = { parse };
