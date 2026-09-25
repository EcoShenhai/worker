'use strict';
const router = require('express').Router();
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// Public auth flow
router.post('/register', authLimiter, c.register);
router.post('/verify-email', authLimiter, c.verifyEmail);
router.post('/login', authLimiter, c.login);
router.post('/verify-mfa', authLimiter, c.verifyMfa);
router.post('/resend-code', authLimiter, c.resendCode);
router.post('/forgot-password', authLimiter, c.forgotPassword);
router.post('/reset-password', authLimiter, c.resetPassword);
router.post('/refresh', authLimiter, c.refresh);
router.post('/logout', c.logout);

// Authenticated
router.get('/me', authenticate, c.me);
router.post('/change-password', authenticate, c.changePassword);

// EcoID dual authentication (additive; routes above unchanged)
const ecoid = require("../controllers/ecoidController");
router.post("/ecoid/exchange", authLimiter, ecoid.exchange);
router.post("/ecoid/register", authLimiter, ecoid.register);
router.post("/ecoid/connect", authLimiter, ecoid.connect);
router.get("/ecoid/status", authenticate, ecoid.status);
router.post("/ecoid/link", authLimiter, authenticate, ecoid.link);
router.post("/ecoid/unlink", authenticate, ecoid.unlink);

module.exports = router;
