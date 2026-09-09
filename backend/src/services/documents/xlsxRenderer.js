'use strict';
const ExcelJS = require('exceljs');

/**
 * Render a document's tabular content to a real .xlsx buffer: one worksheet per
 * table in content.tables, plus the action matrix if present. Header rows are
 * bold on the brand colour; columns auto-sized.
 */

function sanitizeSheetName(name, fallback) {
  let n = String(name || fallback || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
  return n || fallback || 'Sheet';
}

function addSheet(wb, title, columns, rows, usedNames) {
  let base = sanitizeSheetName(title, 'Sheet');
  let name = base;
  let i = 2;
  while (usedNames.has(name)) { name = sanitizeSheetName(base.slice(0, 28) + ' ' + i, 'Sheet ' + i); i++; }
  usedNames.add(name);
  const ws = wb.addWorksheet(name);
  const header = ws.addRow(columns);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B6E4F' } }; });
  rows.forEach((r) => {
    // Coerce numeric-looking strings back to numbers so Excel treats them as numbers.
    ws.addRow(columns.map((_, ci) => {
      const v = r[ci];
      if (v === '' || v === null || v === undefined) return '';
      const n = Number(v);
      return (String(v).trim() !== '' && Number.isFinite(n) && String(n) === String(v).trim()) ? n : v;
    }));
  });
  // auto width
  ws.columns.forEach((col, idx) => {
    let max = String(columns[idx] || '').length;
    rows.forEach((r) => { const L = String(r[idx] == null ? '' : r[idx]).length; if (L > max) max = L; });
    col.width = Math.min(Math.max(max + 2, 10), 60);
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

async function render(document) {
  const c = document.content || {};
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Worker';
  const used = new Set();

  (c.tables || []).forEach((t, i) => {
    if (Array.isArray(t.columns) && t.columns.length) {
      addSheet(wb, t.title || `Table ${i + 1}`, t.columns, t.rows || [], used);
    }
  });

  if (Array.isArray(c.action_matrix) && c.action_matrix.length) {
    addSheet(wb, 'Action Matrix', ['Action', 'Responsible', 'Timeline'],
      c.action_matrix.map((a) => [a.action, a.responsible, a.timeline]), used);
  }

  if (!used.size) {
    // Nothing tabular — produce a minimal sheet so the file is valid.
    addSheet(wb, 'Document', ['Field', 'Value'], [
      ['Title', c.title || document.title || ''],
      ['Reference', document.referenceNumber || ''],
      ['Type', document.type || ''],
    ], used);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

module.exports = { render };
