'use strict';
const router = require('express').Router();
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/login', authLimiter, c.login);
router.post('/refresh', authLimiter, c.refresh);
router.post('/logout', c.logout);
router.get('/me', authenticate, c.me);
router.post('/change-password', authenticate, c.changePassword);

module.exports = router;
