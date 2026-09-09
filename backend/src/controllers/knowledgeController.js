'use strict';
const fs = require('fs/promises');
const path = require('path');
const { KnowledgeDocument } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const storage = require('../services/storage/storageService');
const audit = require('../services/audit/auditService');
const { extractText } = require('../services/extract/textExtractor');
const { scopeWhere, stamp, owns } = require('../utils/tenancy');

const list = asyncHandler(async (req, res) => {
  const docs = await KnowledgeDocument.findAll({
    where: scopeWhere(req),
    order: [['createdAt', 'DESC']],
    attributes: { exclude: ['extractedText'] },
    limit: 200,
  });
  res.json({ documents: docs });
});

// Upload a reference document. Text extraction for common types can be added
// via the pdf/docx tooling; Phase 1 stores the file + optional pasted text.
const upload = asyncHandler(async (req, res) => {
  if (!req.file && !req.body.extractedText) throw ApiError.badRequest('Provide a file or extractedText');
  let key = null;
  let extracted = req.body.extractedText || null;
  let needsOcr = false;
  if (req.file) {
    // Extract text from the temp file BEFORE it is moved/removed.
    if (!extracted) {
      const r = await extractText(req.file.path, req.file.mimetype);
      extracted = r.text || null;
      needsOcr = !!r.needsOcr;
    }
    const ext = path.extname(req.file.originalname || '') || '.bin';
    key = storage.datedKey('knowledge', ext);
    await storage.saveFromPath(req.file.path, key);
    await fs.unlink(req.file.path).catch(() => {});
  }
  const doc = await KnowledgeDocument.create({
    title: req.body.title || (req.file && req.file.originalname) || 'Untitled',
    category: req.body.category || null,
    storageKey: key,
    mimeType: req.file ? req.file.mimetype : null,
    extractedText: extracted,
    uploadedById: req.user.id,
    ...stamp(req, {}),
  });
  await audit.record(req, 'knowledge.upload', {
    resourceType: 'knowledge',
    resourceId: doc.id,
    metadata: { hasText: !!extracted, needsOcr },
  });
  res.status(201).json({
    document: { ...doc.toJSON(), extractedText: undefined },
    extractedChars: extracted ? extracted.length : 0,
    needsOcr,
  });
});

const remove = asyncHandler(async (req, res) => {
  const doc = await KnowledgeDocument.findByPk(req.params.id);
  if (!owns(req, doc)) throw ApiError.notFound('Not found');
  if (!doc) throw ApiError.notFound('Not found');
  if (doc.storageKey) await storage.delete(doc.storageKey).catch(() => {});
  await doc.destroy();
  await audit.record(req, 'knowledge.delete', { resourceType: 'knowledge', resourceId: req.params.id });
  res.json({ ok: true });
});

module.exports = { list, upload, remove };
