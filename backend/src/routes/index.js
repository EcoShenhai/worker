'use strict';
const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/sessions', require('./sessionRoutes'));
router.use('/recordings', require('./recordingRoutes'));
router.use('/transcripts', require('./transcriptRoutes'));
router.use('/documents', require('./documentRoutes'));
router.use('/emails', require('./emailRoutes'));
router.use('/workspace', require('./workspaceRoutes'));
router.use('/knowledge', require('./knowledgeRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/tenant', require('./tenantRoutes'));

module.exports = router;
