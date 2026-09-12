'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class WorkspaceSession extends Model {}

  WorkspaceSession.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: true },
      title: { type: DataTypes.STRING, allowNull: false },
      kind: {
        // What was captured: meeting, interview, briefing, dictation, field_report, consultation, other
        type: DataTypes.ENUM(
          'meeting',
          'interview',
          'briefing',
          'dictation',
          'field_report',
          'consultation',
          'other'
        ),
        allowNull: false,
        defaultValue: 'meeting',
      },
      referenceNumber: { type: DataTypes.STRING, allowNull: true },
      department: { type: DataTypes.STRING, allowNull: true },
      classification: {
        type: DataTypes.ENUM('unclassified', 'internal', 'confidential', 'restricted'),
        allowNull: false,
        defaultValue: 'internal',
      },
      occurredOn: { type: DataTypes.DATEONLY, allowNull: true },
      location: { type: DataTypes.STRING, allowNull: true },
      // Free-form attendee list captured by the officer before/after the meeting.
      attendees: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      agenda: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      status: {
        type: DataTypes.ENUM('open', 'processing', 'ready', 'archived'),
        allowNull: false,
        defaultValue: 'open',
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      ownerId: { type: DataTypes.UUID, allowNull: false },
    },
    {
      sequelize,
      modelName: 'WorkspaceSession',
      tableName: 'workspace_sessions',
    }
  );

  return WorkspaceSession;
};
