'use strict';
const router = require('express').Router();
const c = require('../controllers/workspaceController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/command', c.command);
router.get('/outstanding-actions', c.outstandingActions);
router.get('/search', c.search);

module.exports = router;
