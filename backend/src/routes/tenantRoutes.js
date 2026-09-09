'use strict';
const router = require('express').Router();
const c = require('../controllers/tenantController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { uploadDoc } = require('../middleware/upload');

router.use(authenticate);
router.get('/', c.get);
router.put('/', requireRole('admin'), c.update);
router.post('/logo', requireRole('admin'), uploadDoc.single('file'), c.uploadLogo);
router.post('/signature', requireRole('admin'), uploadDoc.single('file'), c.uploadSignature);

module.exports = router;
