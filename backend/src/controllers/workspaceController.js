'use strict';
const { Op } = require('sequelize');
const { Document, WorkspaceSession, KnowledgeDocument } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const AIService = require('../services/ai/AIService');
const audit = require('../services/audit/auditService');
const { scopeWhere, owns } = require('../utils/tenancy');

/**
 * The "AI workspace" command surface. Natural-language instructions run against
 * the office's own records, e.g. "extract all outstanding actions", "summarize
 * the attached correspondence", "prepare a briefing note for the PS".
 */

// POST /workspace/command { command, sessionId? }
const command = asyncHandler(async (req, res) => {
  const { command: cmd, sessionId } = req.body;
  if (!cmd) throw ApiError.badRequest('command is required');

  let context = '';
  if (sessionId) {
    const session = await WorkspaceSession.findByPk(sessionId, { include: [{ model: Document, as: 'documents' }] });
    if (owns(req, session)) {
      context = `Session: ${session.title}\nDocuments:\n` +
        (session.documents || []).map((d) => `- [${d.type}] ${d.title}: ${JSON.stringify(d.content).slice(0, 2000)}`).join('\n');
    }
  }

  const { text } = await AIService.generate(
    `You are assisting an administrative officer. Carry out the instruction using only the provided context. ` +
      `If context is insufficient, say what additional records are needed.\n\nInstruction: ${cmd}\n\nContext:\n${context || '(no session context provided)'}`
  );
  await audit.record(req, 'workspace.command', { metadata: { sessionId: sessionId || null } });
  res.json({ result: text });
});

// GET /workspace/outstanding-actions  -> scans minutes documents for open action items
const outstandingActions = asyncHandler(async (req, res) => {
  const docs = await Document.findAll({
    where: scopeWhere(req, { type: { [Op.in]: ['minutes', 'action_matrix'] } }),
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  const actions = [];
  docs.forEach((d) => {
    const matrix = (d.content && d.content.action_matrix) || [];
    matrix.forEach((a) => actions.push({ documentId: d.id, documentTitle: d.title, ...a }));
  });
  res.json({ count: actions.length, actions });
});

// GET /workspace/search?q=...  -> keyword search across documents + knowledge base
const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) throw ApiError.badRequest('q is required');
  const like = { [Op.iLike]: `%${q}%` };
  const documents = await Document.findAll({
    where: scopeWhere(req, { [Op.or]: [{ title: like }, { referenceNumber: like }] }),
    limit: 50,
    order: [['createdAt', 'DESC']],
  });
  const knowledge = await KnowledgeDocument.findAll({
    where: scopeWhere(req, { [Op.or]: [{ title: like }, { extractedText: like }] }),
    limit: 50,
    order: [['createdAt', 'DESC']],
    attributes: { exclude: ['extractedText'] },
  });
  res.json({ documents, knowledge });
});

module.exports = { command, outstandingActions, search };
