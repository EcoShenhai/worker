'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Recording extends Model {}
  Recording.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      sessionId: { type: DataTypes.UUID, allowNull: false },
      uploadedById: { type: DataTypes.UUID, allowNull: false },
      // Original audio is preserved as a source record (chain of custody).
      source: { type: DataTypes.ENUM('recorded', 'uploaded'), allowNull: false, defaultValue: 'recorded' },
      originalFilename: { type: DataTypes.STRING, allowNull: true },
      storageKey: { type: DataTypes.STRING, allowNull: false },
      storageDriver: { type: DataTypes.STRING, allowNull: false, defaultValue: 'local' },
      mimeType: { type: DataTypes.STRING, allowNull: true },
      sizeBytes: { type: DataTypes.BIGINT, allowNull: true },
      durationSeconds: { type: DataTypes.INTEGER, allowNull: true },
      // pending | transcribing | transcribed | failed
      status: {
        type: DataTypes.ENUM('pending', 'transcribing', 'transcribed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      error: { type: DataTypes.TEXT, allowNull: true },
    },
    { sequelize, modelName: 'Recording', tableName: 'recordings' }
  );
  return Recording;
};
