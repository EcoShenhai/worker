'use strict';

const router = require('express').Router();
const c = require('../controllers/billingController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/invoices', c.listInvoices);
router.get('/invoices/:id', c.getInvoice);
router.get('/invoices/:id/pdf', c.invoicePdf);

router.get('/receipts', c.listReceipts);
router.get('/receipts/:id', c.getReceipt);
router.get('/receipts/:id/pdf', c.receiptPdf);

module.exports = router;
