'use strict';
const { Template } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../services/audit/auditService');
const { scopeWhere, stamp, owns } = require('../utils/tenancy');

// List this tenant's saved templates.
const list = asyncHandler(async (req, res) => {
  const rows = await Template.findAll({ where: scopeWhere(req, { isDefault: false }), order: [['createdAt', 'DESC']] });
  const templates = rows.map((t) => ({
    id: t.id,
    name: t.name,
    documentType: t.documentType,
    content: (t.config && t.config.content) || {},
  }));
  res.json({ templates });
});

// Save a new template (typically "save as template" from a document).
const create = asyncHandler(async (req, res) => {
  const { name, documentType, content } = req.body;
  if (!name || !documentType) throw ApiError.badRequest('name and documentType are required');
  const tpl = await Template.create({
    name: String(name).trim(),
    documentType,
    config: { content: content || {} },
    createdById: req.user.id,
    ...stamp(req, {}),
  });
  await audit.record(req, 'template.create', { resourceType: 'template', resourceId: tpl.id, metadata: { documentType } });
  res.status(201).json({ template: { id: tpl.id, name: tpl.name, documentType: tpl.documentType, content } });
});

const remove = asyncHandler(async (req, res) => {
  const tpl = await Template.findByPk(req.params.id);
  if (!owns(req, tpl)) throw ApiError.notFound('Template not found');
  await tpl.destroy();
  await audit.record(req, 'template.delete', { resourceType: 'template', resourceId: req.params.id });
  res.json({ ok: true });
});

module.exports = { list, create, remove };
