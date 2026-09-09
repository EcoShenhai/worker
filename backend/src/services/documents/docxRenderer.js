'use strict';
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, Header, Footer,
  PageNumber,
} = require('docx');

/**
 * Renders a structured government document to a .docx buffer.
 * Branding (logo/header/footer) is controlled here — the AI never injects it.
 * Drop a PNG at src/templates/assets/logo.png to enable the crest.
 */
const LOGO_PATH = path.resolve(__dirname, '..', '..', 'templates', 'assets', 'logo.png');

const CLASS_LABEL = {
  unclassified: 'UNCLASSIFIED',
  internal: 'FOR INTERNAL USE',
  confidential: 'CONFIDENTIAL',
  restricted: 'RESTRICTED',
};

function logoRun() {
  if (!fs.existsSync(LOGO_PATH)) return null;
  try {
    return new ImageRun({
      type: 'png',
      data: fs.readFileSync(LOGO_PATH),
      transformation: { width: 70, height: 70 },
    });
  } catch (e) {
    return null;
  }
}

function buildHeader(doc) {
  const children = [];
  const logo = logoRun();
  if (logo) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [logo] }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'REPUBLIC OF KENYA', bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'OFFICE OF THE PRESIDENT — PROVINCIAL ADMINISTRATION', bold: true, size: 20 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
      children: [new TextRun({ text: doc.department || '', size: 18 })],
    })
  );
  return new Header({ children });
}

function buildFooter(doc) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: '888888' } },
        children: [
          new TextRun({ text: `${CLASS_LABEL[doc.classification] || ''}   `, size: 14, color: '555555' }),
          new TextRun({ text: 'Page ', size: 14, color: '555555' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: '555555' }),
          new TextRun({ text: ' of ', size: 14, color: '555555' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: '555555' }),
        ],
      }),
    ],
  });
}

function metaBlock(doc) {
  const rows = [];
  const add = (k, v) => {
    if (!v) return;
    rows.push(
      new TableRow({
        children: [
          new TableCell({ width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 18 })] })] }),
          new TableCell({ width: { size: 6800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: String(v), size: 18 })] })] }),
        ],
      })
    );
  };
  add('Ref. No.', doc.referenceNumber);
  add('Classification', CLASS_LABEL[doc.classification]);
  add('Date', new Date(doc.createdAt || Date.now()).toDateString());
  if (doc.recipient) add('To', doc.recipient);
  if (rows.length === 0) return [];
  return [
    new Table({
      columnWidths: [2200, 6800],
      width: { size: 9000, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
      },
      rows,
    }),
    new Paragraph({ text: '' }),
  ];
}

function p(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text: text || '', ...opts })], spacing: { after: 120 } });
}

function actionMatrixTable(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const header = new TableRow({
    tableHeader: true,
    children: ['Action', 'Responsible', 'Deadline'].map(
      (h) => new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })] })
    ),
  });
  const rows = items.map(
    (it) =>
      new TableRow({
        children: [
          new TableCell({ width: { size: 3800, type: WidthType.DXA }, children: [p(it.action, { size: 18 })] }),
          new TableCell({ width: { size: 2800, type: WidthType.DXA }, children: [p(it.responsible, { size: 18 })] }),
          new TableCell({ width: { size: 2400, type: WidthType.DXA }, children: [p(it.deadline, { size: 18 })] }),
        ],
      })
  );
  return [
    new Table({ columnWidths: [3800, 2800, 2400], width: { size: 9000, type: WidthType.DXA }, rows: [header, ...rows] }),
    new Paragraph({ text: '' }),
  ];
}

// ---- Body builders per document type --------------------------------------

function bodyForMinutes(content) {
  const out = [];
  if (content.heading) out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: content.heading, bold: true })] }));
  if (content.preamble) out.push(p(content.preamble));
  (content.sections || []).forEach((s) => {
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: s.title || '', bold: true })] }));
    out.push(p(s.body));
  });
  if (content.action_matrix && content.action_matrix.length) {
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Action Matrix', bold: true })] }));
    out.push(...actionMatrixTable(content.action_matrix));
  }
  if (content.closing) out.push(p(content.closing));
  return out;
}

function bodyForMemo(content) {
  const out = [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'INTERNAL MEMORANDUM', bold: true })] })];
  ['to', 'from', 'through', 'subject'].forEach((k) => {
    if (content[k]) out.push(p(`${k.toUpperCase()}: ${content[k]}`, { bold: k === 'subject' }));
  });
  out.push(new Paragraph({ text: '' }));
  if (Array.isArray(content.paragraphs)) content.paragraphs.forEach((para) => out.push(p(para)));
  else if (content.body) out.push(p(content.body));
  if (content.signoff) out.push(new Paragraph({ text: '' }), p(content.signoff));
  return out;
}

function bodyForLetter(content) {
  const out = [];
  if (content.date) out.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: content.date, size: 20 })] }));
  if (content.recipient_block) content.recipient_block.split('\n').forEach((l) => out.push(p(l)));
  out.push(new Paragraph({ text: '' }));
  if (content.salutation) out.push(p(content.salutation));
  if (content.subject) out.push(p(content.subject, { bold: true, underline: {} }));
  if (Array.isArray(content.paragraphs)) content.paragraphs.forEach((para) => out.push(p(para)));
  else if (content.body) out.push(p(content.body));
  if (content.closing) out.push(new Paragraph({ text: '' }), p(content.closing));
  if (content.signature) out.push(new Paragraph({ text: '' }), p(content.signature, { bold: true }));
  return out;
}

function bodyForSpeech(content) {
  const out = [];
  if (content.heading) out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: content.heading, bold: true })] }));
  const body = content.body || '';
  body.split(/\n\n+/).forEach((para) => { if (para.trim()) out.push(p(para.trim())); });
  if (content.closing) out.push(p(content.closing));
  return out;
}

function genericTable(t) {
  const cols = t.columns || [];
  const widthEach = Math.floor(9000 / Math.max(cols.length, 1));
  const header = new TableRow({
    tableHeader: true,
    children: cols.map((h) => new TableCell({
      width: { size: widthEach, type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text: String(h), bold: true, size: 16 })] })],
    })),
  });
  const body = (t.rows || []).map((r) => new TableRow({
    children: cols.map((_, i) => new TableCell({
      width: { size: widthEach, type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text: String(r[i] == null ? '' : r[i]), size: 16 })] })],
    })),
  }));
  return new Table({ columnWidths: cols.map(() => widthEach), width: { size: 9000, type: WidthType.DXA }, rows: [header, ...body] });
}

function bodyGeneric(content) {
  const out = [];
  if (content.title) out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: content.title, bold: true })] }));
  if (content.executive_summary) {
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Executive Summary', bold: true })] }));
    out.push(p(content.executive_summary));
  }
  (content.sections || []).forEach((s) => {
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: s.title || '', bold: true })] }));
    out.push(p(s.body));
  });
  if (Array.isArray(content.recommendations) && content.recommendations.length) {
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Recommendations', bold: true })] }));
    content.recommendations.forEach((r, i) => out.push(p(`${i + 1}. ${r}`)));
  }
  if (!content.title && content.body) out.push(p(content.body));
  (content.tables || []).forEach((t) => {
    if (t.title) out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t.title, bold: true })] }));
    out.push(genericTable(t));
    out.push(new Paragraph({ children: [] }));
  });
  return out;
}

function buildBody(doc) {
  const c = doc.content || {};
  switch (doc.type) {
    case 'minutes': return bodyForMinutes(c);
    case 'memo': case 'circular': return bodyForMemo(c);
    case 'letter': return bodyForLetter(c);
    case 'speech': return bodyForSpeech(c);
    default: return bodyGeneric(c);
  }
}

async function render(doc) {
  const document = new Document({
    creator: 'Worker — AI Administrative Workplace Agent',
    title: doc.title,
    sections: [
      {
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        headers: { default: buildHeader(doc) },
        footers: { default: buildFooter(doc) },
        children: [...metaBlock(doc), ...buildBody(doc)],
      },
    ],
  });
  return Packer.toBuffer(document);
}

module.exports = { render, CLASS_LABEL };
