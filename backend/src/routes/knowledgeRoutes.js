'use strict';
const router = require('express').Router();
const c = require('../controllers/knowledgeController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { uploadDoc } = require('../middleware/upload');

router.use(authenticate);
router.get('/', c.list);
router.post('/', requireRole('officer'), uploadDoc.single('file'), c.upload);
router.delete('/:id', requireRole('admin'), c.remove);

module.exports = router;
