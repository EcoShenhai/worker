'use strict';
const router = require('express').Router();
const rec = require('../controllers/recordingController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);
router.put('/:id', requireRole('officer'), rec.verifyTranscript);

module.exports = router;
