'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class DocumentApproval extends Model {}
  DocumentApproval.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      documentId: { type: DataTypes.UUID, allowNull: false },
      actorId: { type: DataTypes.UUID, allowNull: false },
      action: { type: DataTypes.ENUM('submitted', 'approved', 'rejected', 'finalized'), allowNull: false },
      fromStatus: { type: DataTypes.STRING, allowNull: true },
      toStatus: { type: DataTypes.STRING, allowNull: true },
      comment: { type: DataTypes.TEXT, allowNull: true },
    },
    { sequelize, modelName: 'DocumentApproval', tableName: 'document_approvals' }
  );
  return DocumentApproval;
};
