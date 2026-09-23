'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class SupportMessage extends Model {}
  SupportMessage.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ticketRef: { type: DataTypes.STRING(60), allowNull: false },
    kind: { type: DataTypes.STRING(32), allowNull: false },
    globalEcoId: { type: DataTypes.STRING, allowNull: true },
    territoryCode: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'KE' },
    resolution: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    resolvedBy: { type: DataTypes.STRING, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    certified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, { sequelize, modelName: 'SupportMessage', tableName: 'support_messages', underscored: false });
  return SupportMessage;
};
