'use strict';
const router = require('express').Router();
const c = require('../controllers/sessionController');
const rec = require('../controllers/recordingController');
const doc = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { uploadAudio } = require('../middleware/upload');

router.use(authenticate);

router.get('/', c.list);
router.post('/', requireRole('officer'), c.create);
router.get('/:id', c.get);
router.put('/:id', requireRole('officer'), c.update);
router.delete('/:id', requireRole('admin'), c.remove);

// Nested: recordings + minutes generation
router.post('/:sessionId/recordings', requireRole('officer'), uploadAudio.single('file'), rec.upload);
router.post('/:sessionId/minutes', requireRole('officer'), doc.generateMinutes);

module.exports = router;
