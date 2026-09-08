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

module.exports = router;
