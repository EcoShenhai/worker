'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Template extends Model {}
  Template.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      documentType: { type: DataTypes.STRING, allowNull: false },
      // Structured branding + layout config used by the document generator.
      config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdById: { type: DataTypes.UUID, allowNull: true },
    },
    { sequelize, modelName: 'Template', tableName: 'templates' }
  );
  return Template;
};
