'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Invoice extends Model {}

  Invoice.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      paymentId: { type: DataTypes.UUID, allowNull: false },
      invoiceNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
      status: {
        type: DataTypes.ENUM('issued', 'void'),
        allowNull: false,
        defaultValue: 'issued',
      },
      issueDate: { type: DataTypes.DATE, allowNull: false },
      dueDate: { type: DataTypes.DATE, allowNull: true },
      currency: { type: DataTypes.STRING, allowNull: false },
      subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      taxAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      customerName: { type: DataTypes.STRING, allowNull: false },
      customerEmail: { type: DataTypes.STRING, allowNull: true },
      customerDepartment: { type: DataTypes.STRING, allowNull: true },
      customerReference: { type: DataTypes.STRING, allowNull: true },
      taxPin: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.STRING, allowNull: false },
      items: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    },
    {
      sequelize,
      modelName: 'Invoice',
      tableName: 'invoices',
    }
  );

  return Invoice;
};
