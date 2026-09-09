'use strict';
const { Document, DocumentApproval, WorkspaceSession, Transcript, TranscriptSegment } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../services/audit/auditService');
const AIService = require('../services/ai/AIService');
const documentAI = require('../services/documents/documentAI');
const docxRenderer = require('../services/documents/docxRenderer');
const storage = require('../services/storage/storageService');
const { generateReference } = require('../utils/refNumber');

const VALID_TYPES = [
  'minutes', 'memo', 'letter', 'report', 'policy_brief',
  'briefing_note', 'concept_note', 'circular', 'action_matrix',
];

const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.status) where.status = req.query.status;
  if (req.query.sessionId) where.sessionId = req.query.sessionId;
  const documents = await Document.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Math.min(parseInt(req.query.limit || '100', 10), 300),
  });
  res.json({ documents });
});

const get = asyncHandler(async (req, res) => {
  const document = await Document.findByPk(req.params.id, {
    include: [{ model: DocumentApproval, as: 'approvals' }],
  });
  if (!document) throw ApiError.notFound('Document not found');
  res.json({ document });
});

const create = asyncHandler(async (req, res) => {
  const { type, title, content, classification, department, recipient, sessionId } = req.body;
  if (!VALID_TYPES.includes(type)) throw ApiError.badRequest('Invalid document type');
  if (!title) throw ApiError.badRequest('title is required');
  const document = await Document.create({
    type,
    title,
    content: content || {},
    classification: classification || 'internal',
    department,
    recipient,
    sessionId: sessionId || null,
    referenceNumber: generateReference(type),
    authorId: req.user.id,
  });
  await audit.record(req, 'document.create', { resourceType: 'document', resourceId: document.id, metadata: { type } });
  res.status(201).json({ document });
});

const update = asyncHandler(async (req, res) => {
  const document = await Document.findByPk(req.params.id);
  if (!document) throw ApiError.notFound('Document not found');
  if (document.status === 'final') throw ApiError.conflict('Final documents cannot be edited');
  ['title', 'content', 'classification', 'department', 'recipient'].forEach((f) => {
    if (req.body[f] !== undefined) document[f] = req.body[f];
  });
  document.version += 1;
  await document.save();
  await audit.record(req, 'document.update', { resourceType: 'document', resourceId: document.id });
  res.json({ document });
});

const remove = asyncHandler(async (req, res) => {
  const document = await Document.findByPk(req.params.id);
  if (!document) throw ApiError.notFound('Document not found');
  await document.destroy();
  await audit.record(req, 'document.delete', { resourceType: 'document', resourceId: req.params.id });
  res.json({ ok: true });
});

// POST /sessions/:sessionId/minutes  -> multi-pass AI minutes from the transcript
const generateMinutes = asyncHandler(async (req, res) => {
  const session = await WorkspaceSession.findByPk(req.params.sessionId);
  if (!session) throw ApiError.notFound('Session not found');

  const transcripts = await Transcript.findAll({
    where: { sessionId: session.id },
    order: [['createdAt', 'ASC']],
  });
  if (!transcripts.length) throw ApiError.badRequest('No transcript found for this session. Transcribe a recording first.');

  const sourceText = transcripts
    .map((t) => (t.editedText || t.rawText || '').trim())
    .filter(Boolean)
    .join('\n\n');
  if (!sourceText) throw ApiError.badRequest('Transcript is empty');

  const meta = {
    title: session.title,
    occurredOn: session.occurredOn,
    attendees: (session.attendees || []).map((a) => (typeof a === 'string' ? a : a.name)).filter(Boolean),
  };

  const { content } = await documentAI.transcriptToMinutes(sourceText, meta);

  const document = await Document.create({
    type: 'minutes',
    title: content.heading || `Minutes — ${session.title}`,
    content,
    classification: session.classification,
    department: session.department,
    sessionId: session.id,
    referenceNumber: generateReference('minutes'),
    aiAssisted: true,
    authorId: req.user.id,
  });

  await audit.record(req, 'document.generate_minutes', {
    resourceType: 'document',
    resourceId: document.id,
    metadata: { sessionId: session.id, transcriptCount: transcripts.length },
  });
  res.status(201).json({ document });
});

// POST /documents/draft  { type, brief, title, ... }  -> AI draft of memo/letter/report/etc.
const draft = asyncHandler(async (req, res) => {
  const { type, brief, title, classification, department, recipient, sessionId } = req.body;
  if (!VALID_TYPES.includes(type)) throw ApiError.badRequest('Invalid document type');
  if (!brief) throw ApiError.badRequest('brief is required');

  const shape = shapeForType(type);
  const { data: content } = await AIService.generateJson(
    `Draft a formal Kenyan government ${type.replace('_', ' ')} from this brief.\n` +
      `Return JSON with this shape: ${shape}\n\nBrief:\n${brief}`
  );

  const document = await Document.create({
    type,
    title: title || content.title || content.subject || `${type} draft`,
    content,
    classification: classification || 'internal',
    department,
    recipient,
    sessionId: sessionId || null,
    referenceNumber: generateReference(type),
    aiAssisted: true,
    authorId: req.user.id,
  });
  await audit.record(req, 'document.draft', { resourceType: 'document', resourceId: document.id, metadata: { type } });
  res.status(201).json({ document });
});

function shapeForType(type) {
  switch (type) {
    case 'memo':
      return '{"to":string,"from":string,"through":string,"subject":string,"paragraphs":[string],"signoff":string}';
    case 'letter':
      return '{"date":string,"recipient_block":string,"salutation":string,"subject":string,"paragraphs":[string],"closing":string,"signature":string}';
    case 'policy_brief':
      return '{"title":string,"executive_summary":string,"sections":[{"title":string,"body":string}],"recommendations":[string]}';
    case 'report':
    case 'briefing_note':
    case 'concept_note':
      return '{"title":string,"executive_summary":string,"sections":[{"title":string,"body":string}],"recommendations":[string]}';
    case 'circular':
      return '{"to":string,"from":string,"subject":string,"paragraphs":[string],"signoff":string}';
    default:
      return '{"title":string,"body":string}';
  }
}

// --- Approval workflow ------------------------------------------------------
async function transition(req, res, action, toStatus, allowedFrom) {
  const document = await Document.findByPk(req.params.id);
  if (!document) throw ApiError.notFound('Document not found');
  if (allowedFrom && !allowedFrom.includes(document.status)) {
    throw ApiError.conflict(`Cannot ${action} a document in status '${document.status}'`);
  }
  const fromStatus = document.status;
  document.status = toStatus;
  await document.save();
  await DocumentApproval.create({
    documentId: document.id,
    actorId: req.user.id,
    action,
    fromStatus,
    toStatus,
    comment: req.body.comment || null,
  });
  await audit.record(req, `document.${action}`, { resourceType: 'document', resourceId: document.id });
  res.json({ document });
}

const submit = asyncHandler((req, res) => transition(req, res, 'submitted', 'in_review', ['draft']));
const approve = asyncHandler((req, res) => transition(req, res, 'approved', 'approved', ['in_review']));
const reject = asyncHandler((req, res) => transition(req, res, 'rejected', 'draft', ['in_review']));
const finalize = asyncHandler((req, res) => transition(req, res, 'finalized', 'final', ['approved']));

// POST /documents/:id/export  -> render DOCX, store, return download key
const exportDocx = asyncHandler(async (req, res) => {
  const document = await Document.findByPk(req.params.id);
  if (!document) throw ApiError.notFound('Document not found');
  const buffer = await docxRenderer.render(document);
  const key = storage.datedKey('documents', '.docx');
  await storage.saveBuffer(buffer, key);
  document.renderedDocxKey = key;
  await document.save();
  await audit.record(req, 'document.export_docx', { resourceType: 'document', resourceId: document.id });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${(document.title || 'document').replace(/[^\w.-]+/g, '_')}.docx"`);
  res.send(buffer);
});

module.exports = {
  list, get, create, update, remove,
  generateMinutes, draft,
  submit, approve, reject, finalize,
  exportDocx,
};
