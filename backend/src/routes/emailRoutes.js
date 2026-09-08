'use strict';
const router = require('express').Router();
const c = require('../controllers/emailController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);
router.get('/', c.list);
router.post('/', requireRole('officer'), c.createDraft);
router.post('/ai-draft', requireRole('officer'), c.aiDraft);
router.get('/:id', c.get);
router.put('/:id', requireRole('officer'), c.updateDraft);
router.post('/:id/send', requireRole('officer'), c.send);

module.exports = router;
