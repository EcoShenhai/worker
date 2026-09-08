'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Email extends Model {}
  Email.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      direction: { type: DataTypes.ENUM('incoming', 'outgoing'), allowNull: false, defaultValue: 'outgoing' },
      fromAddress: { type: DataTypes.STRING, allowNull: true },
      toAddress: { type: DataTypes.STRING, allowNull: false },
      cc: { type: DataTypes.STRING, allowNull: true },
      subject: { type: DataTypes.STRING, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      referenceNumber: { type: DataTypes.STRING, allowNull: true },
      // draft | sent | failed | received  -- AI never auto-sends; a human clicks Send.
      status: { type: DataTypes.ENUM('draft', 'sent', 'failed', 'received'), allowNull: false, defaultValue: 'draft' },
      aiAssisted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      finalEditedBody: { type: DataTypes.TEXT, allowNull: true },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      sentById: { type: DataTypes.UUID, allowNull: true },
      threadId: { type: DataTypes.UUID, allowNull: true },
      sessionId: { type: DataTypes.UUID, allowNull: true },
      ownerId: { type: DataTypes.UUID, allowNull: false },
    },
    { sequelize, modelName: 'Email', tableName: 'emails' }
  );
  return Email;
};
