'use strict';
const ExcelJS = require('exceljs');

/**
 * Read the first worksheet of an .xlsx/.csv and produce a compact analysis:
 * headers, all rows, per-column numeric summary, and a small sample.
 * Used to build a narrative report + embedded tables (never feeds every row
 * to the AI — only the summary + a sample).
 */

function cellVal(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.text !== undefined) return v.text;
    if (v.result !== undefined) return v.result;
    if (v.hyperlink) return v.text || v.hyperlink;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v);
  }
  return v;
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function analyzeSpreadsheet(filePath) {
  const wb = new ExcelJS.Workbook();
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.csv')) {
    await wb.csv.readFile(filePath);
  } else {
    await wb.xlsx.readFile(filePath);
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('The spreadsheet has no worksheets.');

  const allRows = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals = (row.values || []).slice(1).map(cellVal);
    if (vals.some((v) => String(v).trim() !== '')) allRows.push(vals);
  });
  if (!allRows.length) throw new Error('The spreadsheet appears to be empty.');

  const headers = (allRows.shift() || []).map((h, i) => (String(h).trim() || `Column ${i + 1}`));
  const rows = allRows;

  const summary = headers.map((h, i) => {
    const nums = rows.map((r) => Number(r[i])).filter((n) => Number.isFinite(n) && String(rows.find(() => true)) !== '');
    const numericVals = rows.map((r) => r[i]).filter((v) => v !== '' && v !== null && Number.isFinite(Number(v))).map(Number);
    if (numericVals.length >= Math.max(1, Math.floor(rows.length * 0.5))) {
      const sum = numericVals.reduce((a, b) => a + b, 0);
      return { column: h, numeric: true, count: numericVals.length, sum: round(sum), avg: round(sum / numericVals.length), min: round(Math.min(...numericVals)), max: round(Math.max(...numericVals)) };
    }
    return { column: h, numeric: false, count: rows.filter((r) => String(r[i]).trim() !== '').length };
  });

  return { sheetName: ws.name, headers, rows, rowCount: rows.length, summary };
}

// Compact text summary for the AI (never the full data set).
function summaryText(a, sampleN = 8) {
  const lines = [];
  lines.push(`Worksheet: ${a.sheetName}`);
  lines.push(`Columns (${a.headers.length}): ${a.headers.join(', ')}`);
  lines.push(`Total data rows: ${a.rowCount}`);
  lines.push('');
  lines.push('Column figures:');
  a.summary.forEach((s) => {
    if (s.numeric) lines.push(`- ${s.column}: count ${s.count}, total ${s.sum}, average ${s.avg}, min ${s.min}, max ${s.max}`);
    else lines.push(`- ${s.column}: ${s.count} non-empty values (text/categorical)`);
  });
  lines.push('');
  lines.push(`Sample rows (first ${Math.min(sampleN, a.rows.length)}):`);
  lines.push(a.headers.join(' | '));
  a.rows.slice(0, sampleN).forEach((r) => lines.push(r.map((c) => String(c)).join(' | ')));
  return lines.join('\n');
}

// Build the two embedded tables (data sample + numeric summary).
function buildTables(a, dataN = 25) {
  const dataTable = {
    title: `Data (first ${Math.min(dataN, a.rowCount)} of ${a.rowCount} rows)`,
    columns: a.headers,
    rows: a.rows.slice(0, dataN).map((r) => r.map((c) => String(c))),
  };
  const numeric = a.summary.filter((s) => s.numeric);
  const tables = [dataTable];
  if (numeric.length) {
    tables.push({
      title: 'Summary of key figures',
      columns: ['Field', 'Count', 'Total', 'Average', 'Minimum', 'Maximum'],
      rows: numeric.map((s) => [s.column, String(s.count), String(s.sum), String(s.avg), String(s.min), String(s.max)]),
    });
  }
  return tables;
}

module.exports = { analyzeSpreadsheet, summaryText, buildTables };
