'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class SupportTicket extends Model {}
  SupportTicket.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ticketRef: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tenantId: { type: DataTypes.UUID, allowNull: true },
    globalEcoId: { type: DataTypes.STRING, allowNull: true },
    customerEmail: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING(240), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    channel: { type: DataTypes.STRING(8), allowNull: false, validate: { isIn: [['EMAIL', 'ECOBUS', 'BOTH']] } },
    ecobusDelivered: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, { sequelize, modelName: 'SupportTicket', tableName: 'support_tickets', underscored: false });
  return SupportTicket;
};
