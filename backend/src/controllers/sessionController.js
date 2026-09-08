'use strict';
const { WorkspaceSession, Recording, Transcript, Document } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../services/audit/auditService');

const list = asyncHandler(async (req, res) => {
  const where = req.user.role === 'viewer' ? {} : {};
  const sessions = await WorkspaceSession.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Math.min(parseInt(req.query.limit || '50', 10), 200),
  });
  res.json({ sessions });
});

const create = asyncHandler(async (req, res) => {
  const { title, kind, department, classification, occurredOn, location, attendees, agenda, notes } = req.body;
  if (!title) throw ApiError.badRequest('title is required');
  const session = await WorkspaceSession.create({
    title,
    kind: kind || 'meeting',
    department,
    classification: classification || 'internal',
    occurredOn: occurredOn || null,
    location,
    attendees: Array.isArray(attendees) ? attendees : [],
    agenda: Array.isArray(agenda) ? agenda : [],
    notes,
    ownerId: req.user.id,
  });
  await audit.record(req, 'session.create', { resourceType: 'session', resourceId: session.id });
  res.status(201).json({ session });
});

const get = asyncHandler(async (req, res) => {
  const session = await WorkspaceSession.findByPk(req.params.id, {
    include: [
      { model: Recording, as: 'recordings', include: [{ model: Transcript, as: 'transcript' }] },
      { model: Document, as: 'documents' },
    ],
  });
  if (!session) throw ApiError.notFound('Session not found');
  res.json({ session });
});

const update = asyncHandler(async (req, res) => {
  const session = await WorkspaceSession.findByPk(req.params.id);
  if (!session) throw ApiError.notFound('Session not found');
  const fields = ['title', 'kind', 'department', 'classification', 'occurredOn', 'location', 'attendees', 'agenda', 'notes', 'status'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) session[f] = req.body[f];
  });
  await session.save();
  await audit.record(req, 'session.update', { resourceType: 'session', resourceId: session.id });
  res.json({ session });
});

const remove = asyncHandler(async (req, res) => {
  const session = await WorkspaceSession.findByPk(req.params.id);
  if (!session) throw ApiError.notFound('Session not found');
  await session.destroy();
  await audit.record(req, 'session.delete', { resourceType: 'session', resourceId: req.params.id });
  res.json({ ok: true });
});

module.exports = { list, create, get, update, remove };
