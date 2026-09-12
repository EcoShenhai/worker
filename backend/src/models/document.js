'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Document extends Model {}

  Document.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: true },
      // minutes | memo | letter | report | policy_brief | briefing_note | concept_note | circular | action_matrix
      type: {
        type: DataTypes.ENUM(
          'minutes',
          'memo',
          'letter',
          'report',
          'policy_brief',
          'briefing_note',
          'concept_note',
          'circular',
          'action_matrix'
        ),
        allowNull: false,
      },
      title: { type: DataTypes.STRING, allowNull: false },
      referenceNumber: { type: DataTypes.STRING, allowNull: true },
      classification: {
        type: DataTypes.ENUM('unclassified', 'internal', 'confidential', 'restricted'),
        allowNull: false,
        defaultValue: 'internal',
      },
      department: { type: DataTypes.STRING, allowNull: true },
      recipient: { type: DataTypes.STRING, allowNull: true },
      // Structured content (JSON) is the source of truth; rendering derives from it.
      content: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      // draft | in_review | approved | final | archived
      status: {
        type: DataTypes.ENUM('draft', 'in_review', 'approved', 'final', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      aiAssisted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sessionId: { type: DataTypes.UUID, allowNull: true },
      authorId: { type: DataTypes.UUID, allowNull: false },
      templateId: { type: DataTypes.UUID, allowNull: true },
      // Where the rendered DOCX/PDF live once exported.
      renderedDocxKey: { type: DataTypes.STRING, allowNull: true },
      renderedPdfKey: { type: DataTypes.STRING, allowNull: true },
    },
    { sequelize, modelName: 'Document', tableName: 'documents' }
  );

  return Document;
};
