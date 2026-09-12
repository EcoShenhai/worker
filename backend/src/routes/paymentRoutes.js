'use strict';
const router = require('express').Router();
const c = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Public callback (Safaricom posts here). Keep BEFORE auth middleware.
router.post('/mpesa/callback', c.mpesaCallback);

router.use(authenticate);
router.get('/', requireRole('admin'), c.list);
router.post('/mpesa/initiate', c.mpesaInitiate);
router.post('/subscription/mpesa/initiate', requireRole('admin'), c.subscriptionMpesaInitiate);
router.post('/paypal/create', c.paypalCreate);
router.post('/subscription/paypal/create', requireRole('admin'), c.subscriptionPaypalCreate);
router.post('/paypal/capture', c.paypalCapture);

module.exports = router;
