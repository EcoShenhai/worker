'use strict';
const router = require('express').Router();
const c = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { uploadDoc } = require('../middleware/upload');

router.use(authenticate);

router.get('/', c.list);
router.post('/', requireRole('officer'), c.create);
router.post('/draft', requireRole('officer'), c.draft);
router.post('/from-spreadsheet', requireRole('officer'), uploadDoc.single('file'), c.generateFromSpreadsheet);
router.get('/:id', c.get);
router.put('/:id', requireRole('officer'), c.update);
router.delete('/:id', requireRole('admin'), c.remove);

router.post('/:id/submit', requireRole('officer'), c.submit);
router.post('/:id/approve', requireRole('admin'), c.approve);
router.post('/:id/reject', requireRole('admin'), c.reject);
router.post('/:id/finalize', requireRole('admin'), c.finalize);
router.post('/:id/export', c.exportDocx);

module.exports = router;
