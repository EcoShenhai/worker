'use strict';
// GDPR self-service routes, mounted at <api base>/me.
const router = require('express').Router();
const c = require('../controllers/privacyController');
const guard = require('../middleware/auth').authenticate;
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => res.status(e.status || 500).json({ error: e.message || 'failed' }));
router.get('/export', guard, wrap(c.exportMine));
router.delete('/', guard, wrap(c.deleteMine));
module.exports = router;
