'use strict';

const { Invoice, Receipt } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { scopeWhere, owns } = require('../utils/tenancy');
const { renderInvoice, renderReceipt } = require('../services/payments/billingPdfService');

const listInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.findAll({
    where: scopeWhere(req),
    order: [['issueDate', 'DESC']],
    limit: Math.min(parseInt(req.query.limit || '100', 10), 300),
  });

  res.json({ invoices });
});

const listReceipts = asyncHandler(async (req, res) => {
  const receipts = await Receipt.findAll({
    where: scopeWhere(req),
    order: [['receiptDate', 'DESC']],
    limit: Math.min(parseInt(req.query.limit || '100', 10), 300),
  });

  res.json({ receipts });
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByPk(req.params.id, {
    include: [{ model: Receipt, as: 'receipt' }],
  });

  if (!owns(req, invoice)) throw ApiError.notFound('Invoice not found');

  res.json({ invoice });
});

const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findByPk(req.params.id, {
    include: [{ model: Invoice, as: 'invoice' }],
  });

  if (!owns(req, receipt)) throw ApiError.notFound('Receipt not found');

  res.json({ receipt });
});

const invoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByPk(req.params.id);

  if (!owns(req, invoice)) throw ApiError.notFound('Invoice not found');

  const buffer = await renderInvoice(invoice);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${invoice.invoiceNumber}.pdf"`
  );
  res.send(buffer);
});

const receiptPdf = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findByPk(req.params.id);

  if (!owns(req, receipt)) throw ApiError.notFound('Receipt not found');

  const buffer = await renderReceipt(receipt);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${receipt.receiptNumber}.pdf"`
  );
  res.send(buffer);
});

module.exports = {
  listInvoices,
  listReceipts,
  getInvoice,
  getReceipt,
  invoicePdf,
  receiptPdf,
};
