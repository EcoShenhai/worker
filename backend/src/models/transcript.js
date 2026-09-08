'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Transcript extends Model {}
  Transcript.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      recordingId: { type: DataTypes.UUID, allowNull: false },
      sessionId: { type: DataTypes.UUID, allowNull: false },
      provider: { type: DataTypes.STRING, allowNull: false, defaultValue: 'faster-whisper' },
      model: { type: DataTypes.STRING, allowNull: true },
      language: { type: DataTypes.STRING, allowNull: false, defaultValue: 'en' },
      // Full flat text; segments live in transcript_segments.
      rawText: { type: DataTypes.TEXT, allowNull: true },
      // Officer-corrected text (verification stage). Falls back to rawText.
      editedText: { type: DataTypes.TEXT, allowNull: true },
      verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      verifiedById: { type: DataTypes.UUID, allowNull: true },
      wordCount: { type: DataTypes.INTEGER, allowNull: true },
    },
    { sequelize, modelName: 'Transcript', tableName: 'transcripts' }
  );
  return Transcript;
};
