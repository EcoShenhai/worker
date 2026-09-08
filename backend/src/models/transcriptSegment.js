'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TranscriptSegment extends Model {}
  TranscriptSegment.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      transcriptId: { type: DataTypes.UUID, allowNull: false },
      idx: { type: DataTypes.INTEGER, allowNull: false },
      startSeconds: { type: DataTypes.FLOAT, allowNull: true },
      endSeconds: { type: DataTypes.FLOAT, allowNull: true },
      // Optional speaker label; diarization is a future phase (nullable by design).
      speaker: { type: DataTypes.STRING, allowNull: true },
      text: { type: DataTypes.TEXT, allowNull: false },
    },
    { sequelize, modelName: 'TranscriptSegment', tableName: 'transcript_segments' }
  );
  return TranscriptSegment;
};
