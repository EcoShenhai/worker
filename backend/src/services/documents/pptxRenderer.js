'use strict';
const PptxGenJS = require('pptxgenjs');

/**
 * Render a structured document to a branded .pptx buffer.
 * Title slide, executive summary, one slide per section, table slides, a native
 * bar chart derived from the data (when possible), and a recommendations slide.
 * Charts are real editable PowerPoint charts (no image rasterising needed).
 */

const GREEN = '0B6E4F';
const INK = '14181C';
const GREY = '5B6570';

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Try to derive a bar chart from a data table: first text column = labels,
// first numeric column = values. Returns { title, labels, values } or null.
function deriveChart(tables) {
  const data = (tables || []).find((t) => t.title && /data/i.test(t.title)) || (tables || [])[0];
  if (!data || !Array.isArray(data.columns) || !Array.isArray(data.rows) || !data.rows.length) return null;
  const cols = data.columns;
  let labelIdx = -1;
  let valueIdx = -1;
  for (let i = 0; i < cols.length; i++) {
    const numericCount = data.rows.filter((r) => Number.isFinite(Number(r[i])) && String(r[i]).trim() !== '').length;
    const isNumeric = numericCount >= Math.ceil(data.rows.length * 0.6);
    if (isNumeric && valueIdx === -1) valueIdx = i;
    else if (!isNumeric && labelIdx === -1) labelIdx = i;
  }
  if (labelIdx === -1 || valueIdx === -1) return null;
  const rows = data.rows.slice(0, 12);
  return {
    title: `${cols[valueIdx]} by ${cols[labelIdx]}`,
    labels: rows.map((r) => String(r[labelIdx])),
    values: rows.map((r) => Number(r[valueIdx]) || 0),
  };
}

function addBrandedFooter(slide, department) {
  slide.addText(
    [{ text: 'Worker', options: { bold: true, color: GREEN } }, { text: department ? '  ·  ' + department : '', options: { color: GREY } }],
    { x: 0.4, y: 5.15, w: 9.2, h: 0.3, fontSize: 9, align: 'left' }
  );
}

async function render(document, branding = {}) {
  const c = document.content || {};
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'W', width: 10, height: 5.63 });
  pptx.layout = 'W';
  const dept = document.department || '';

  // Title slide
  const t1 = pptx.addSlide();
  t1.background = { color: '0C1F19' };
  if (branding && branding.logoBuffer) {
    try {
      const mime = (branding.logoType === 'jpg') ? 'image/jpeg' : 'image/' + (branding.logoType || 'png');
      t1.addImage({ data: `data:${mime};base64,${branding.logoBuffer.toString('base64')}`, x: 4.3, y: 0.5, w: 1.4, h: 1.4 });
    } catch (e) { /* ignore */ }
  }
  t1.addText((branding && branding.line1) || 'REPUBLIC OF KENYA', { x: 0.5, y: 2.0, w: 9, h: 0.4, color: 'BFE9D5', fontSize: 14, align: 'center' });
  t1.addText(c.title || document.title || 'Document', { x: 0.5, y: 2.45, w: 9, h: 1.2, color: 'FFFFFF', fontSize: 30, bold: true, align: 'center' });
  if (dept) t1.addText(dept, { x: 0.5, y: 3.7, w: 9, h: 0.4, color: 'BFE9D5', fontSize: 14, align: 'center' });
  if (document.referenceNumber) t1.addText(document.referenceNumber, { x: 0.5, y: 4.6, w: 9, h: 0.3, color: '8FB3A4', fontSize: 11, align: 'center' });

  const heading = (slide, text) => slide.addText(text, { x: 0.4, y: 0.3, w: 9.2, h: 0.6, color: GREEN, fontSize: 22, bold: true });

  if (c.executive_summary) {
    const s = pptx.addSlide();
    heading(s, 'Executive Summary');
    s.addText(String(c.executive_summary), { x: 0.4, y: 1.1, w: 9.2, h: 3.8, color: INK, fontSize: 14, valign: 'top' });
    addBrandedFooter(s, dept);
  }

  (c.sections || []).forEach((sec) => {
    const s = pptx.addSlide();
    heading(s, sec.title || 'Section');
    s.addText(String(sec.body || sec.content || ''), { x: 0.4, y: 1.1, w: 9.2, h: 3.8, color: INK, fontSize: 14, valign: 'top' });
    addBrandedFooter(s, dept);
  });

  // Native bar chart from the data, if derivable
  const chart = deriveChart(c.tables);
  if (chart) {
    const s = pptx.addSlide();
    heading(s, chart.title);
    s.addChart(pptx.ChartType.bar, [{ name: chart.title, labels: chart.labels, values: chart.values }], {
      x: 0.5, y: 1.1, w: 9, h: 3.8, showValue: true, chartColors: [GREEN],
      catAxisLabelColor: INK, valAxisLabelColor: INK, showLegend: false,
    });
    addBrandedFooter(s, dept);
  }

  // Table slides (rows chunked so they fit)
  (c.tables || []).forEach((t) => {
    const cols = t.columns || [];
    if (!cols.length) return;
    const pages = chunk(t.rows || [], 12);
    (pages.length ? pages : [[]]).forEach((pageRows, pi) => {
      const s = pptx.addSlide();
      heading(s, t.title + (pages.length > 1 ? ` (${pi + 1}/${pages.length})` : ''));
      const headerRow = cols.map((h) => ({ text: String(h), options: { bold: true, color: 'FFFFFF', fill: GREEN } }));
      const bodyRows = pageRows.map((r) => cols.map((_, i) => ({ text: String(r[i] == null ? '' : r[i]) })));
      s.addTable([headerRow, ...bodyRows], { x: 0.4, y: 1.1, w: 9.2, fontSize: 10, border: { type: 'solid', color: 'DDDDDD', pt: 0.5 }, autoPage: false });
      addBrandedFooter(s, dept);
    });
  });

  if (Array.isArray(c.action_matrix) && c.action_matrix.length) {
    const s = pptx.addSlide();
    heading(s, 'Action Matrix');
    const rows = [
      ['Action', 'Responsible', 'Timeline'].map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: GREEN } })),
      ...c.action_matrix.map((a) => [a.action, a.responsible, a.timeline].map((v) => ({ text: String(v || '') }))),
    ];
    s.addTable(rows, { x: 0.4, y: 1.1, w: 9.2, fontSize: 11, border: { type: 'solid', color: 'DDDDDD', pt: 0.5 } });
    addBrandedFooter(s, dept);
  }

  if (Array.isArray(c.recommendations) && c.recommendations.length) {
    const s = pptx.addSlide();
    heading(s, 'Recommendations');
    s.addText(c.recommendations.map((r) => ({ text: String(r), options: { bullet: true } })), { x: 0.5, y: 1.1, w: 9, h: 3.8, color: INK, fontSize: 14, valign: 'top' });
    addBrandedFooter(s, dept);
  }

  const data = await pptx.write('nodebuffer');
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

module.exports = { render };
