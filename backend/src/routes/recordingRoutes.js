'use strict';
const router = require('express').Router();
const rec = require('../controllers/recordingController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);
router.post('/:id/transcribe', requireRole('officer'), rec.transcribe);
router.get('/:id/transcript', rec.getTranscript);

module.exports = router;
