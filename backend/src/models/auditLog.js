'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class AuditLog extends Model {}
  AuditLog.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: true },
      action: { type: DataTypes.STRING, allowNull: false },
      resourceType: { type: DataTypes.STRING, allowNull: true },
      resourceId: { type: DataTypes.STRING, allowNull: true },
      // Metadata only. NEVER store document bodies / audio / PII payloads here.
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      ipAddress: { type: DataTypes.STRING, allowNull: true },
      userAgent: { type: DataTypes.STRING, allowNull: true },
    },
    { sequelize, modelName: 'AuditLog', tableName: 'audit_logs' }
  );
  return AuditLog;
};
