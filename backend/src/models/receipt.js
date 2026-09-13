'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Receipt extends Model {}

  Receipt.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      paymentId: { type: DataTypes.UUID, allowNull: false },
      invoiceId: { type: DataTypes.UUID, allowNull: false },
      receiptNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
      status: {
        type: DataTypes.ENUM('issued', 'void'),
        allowNull: false,
        defaultValue: 'issued',
      },
      receiptDate: { type: DataTypes.DATE, allowNull: false },
      provider: {
        type: DataTypes.ENUM('mpesa', 'paypal'),
        allowNull: false,
      },
      providerReference: { type: DataTypes.STRING, allowNull: true },
      providerReceipt: { type: DataTypes.STRING, allowNull: true },
      currency: { type: DataTypes.STRING, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      payerReference: { type: DataTypes.STRING, allowNull: true },
      customerName: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.STRING, allowNull: false },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    },
    {
      sequelize,
      modelName: 'Receipt',
      tableName: 'receipts',
    }
  );

  return Receipt;
};
