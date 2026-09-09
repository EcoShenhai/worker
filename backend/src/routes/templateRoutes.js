'use strict';
const router = require('express').Router();
const c = require('../controllers/templateController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);
router.get('/', c.list);
router.post('/', requireRole('officer'), c.create);
router.delete('/:id', requireRole('officer'), c.remove);

module.exports = router;
