'use strict';
const router = require('express').Router();
const c = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate, requireRole('admin'));
router.get('/users', c.listUsers);
router.post('/users', c.createUser);
router.put('/users/:id', c.updateUser);
router.delete('/users/:id', c.deleteUser);
router.get('/audit', c.listAudit);

module.exports = router;
