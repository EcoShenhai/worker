'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class KnowledgeDocument extends Model {}
  KnowledgeDocument.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      category: { type: DataTypes.STRING, allowNull: true },
      storageKey: { type: DataTypes.STRING, allowNull: true },
      mimeType: { type: DataTypes.STRING, allowNull: true },
      // Extracted plain text for keyword search (Phase 1). Vector search is Phase 2.
      extractedText: { type: DataTypes.TEXT, allowNull: true },
      uploadedById: { type: DataTypes.UUID, allowNull: false },
    },
    { sequelize, modelName: 'KnowledgeDocument', tableName: 'knowledge_documents' }
  );
  return KnowledgeDocument;
};
