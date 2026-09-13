'use strict';

const PDFDocument = require('pdfkit');

function money(currency, amount) {
  return `${String(currency || '').toUpperCase()} ${Number(amount || 0).toFixed(2)}`;
}

function safe(value) {
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildPdf(title, number, subtitle, sections) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).font('Helvetica-Bold').text('WORKER');
    doc.moveDown(0.25);
    doc.fontSize(16).text(title);
    doc.fontSize(10).font('Helvetica').fillColor('#555555').text(safe(subtitle));
    doc.fillColor('#000000');
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text(number);
    doc.moveDown();

    for (const section of sections) {
      if (section.heading) {
        doc.moveDown(0.6);
        doc.fontSize(11).font('Helvetica-Bold').text(section.heading);
        doc.moveDown(0.25);
      }

      for (const row of section.rows || []) {
        doc.fontSize(10).font('Helvetica-Bold').text(`${row.label}: `, { continued: true });
        doc.font('Helvetica').text(safe(row.value));
      }
    }

    doc.moveDown(1);
    doc.fontSize(8).fillColor('#666666').text(
      'This document records a Worker subscription transaction. It is not represented as a KRA/eTIMS tax invoice unless separately issued through a compliant eTIMS integration.'
    );

    doc.end();
  });
}

async function renderInvoice(invoice) {
  const item = Array.isArray(invoice.items) && invoice.items.length
    ? invoice.items[0]
    : null;

  return buildPdf(
    'Invoice',
    invoice.invoiceNumber,
    'Worker subscription invoice',
    [
      {
        heading: 'Customer',
        rows: [
          { label: 'Organisation', value: invoice.customerName },
          { label: 'Email', value: invoice.customerEmail },
          { label: 'Department', value: invoice.customerDepartment },
          { label: 'Reference', value: invoice.customerReference },
          { label: 'Tax PIN', value: invoice.taxPin },
        ],
      },
      {
        heading: 'Invoice details',
        rows: [
          { label: 'Issue date', value: formatDate(invoice.issueDate) },
          { label: 'Due date', value: formatDate(invoice.dueDate) },
          { label: 'Description', value: invoice.description },
          { label: 'Quantity', value: item?.quantity || 1 },
          { label: 'Unit price', value: money(invoice.currency, item?.unitPrice ?? invoice.subtotal) },
          { label: 'Subtotal', value: money(invoice.currency, invoice.subtotal) },
          { label: 'Tax', value: money(invoice.currency, invoice.taxAmount) },
          { label: 'Total', value: money(invoice.currency, invoice.totalAmount) },
          { label: 'Status', value: invoice.status },
        ],
      },
    ]
  );
}

async function renderReceipt(receipt) {
  return buildPdf(
    'Payment Receipt',
    receipt.receiptNumber,
    'Worker subscription payment receipt',
    [
      {
        heading: 'Customer',
        rows: [
          { label: 'Organisation', value: receipt.customerName },
          { label: 'Description', value: receipt.description },
        ],
      },
      {
        heading: 'Payment details',
        rows: [
          { label: 'Receipt date', value: formatDate(receipt.receiptDate) },
          { label: 'Provider', value: receipt.provider },
          { label: 'Provider reference', value: receipt.providerReference },
          { label: 'Provider receipt', value: receipt.providerReceipt },
          { label: 'Payer reference', value: receipt.payerReference },
          { label: 'Amount paid', value: money(receipt.currency, receipt.amount) },
          { label: 'Status', value: receipt.status },
        ],
      },
    ]
  );
}

module.exports = {
  renderInvoice,
  renderReceipt,
};
