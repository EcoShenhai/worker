'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Payment extends Model {}
  Payment.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      provider: { type: DataTypes.ENUM('mpesa', 'paypal'), allowNull: false },
      purpose: { type: DataTypes.STRING, allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'KES' },
      // pending | completed | failed | cancelled
      status: { type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
      // Provider references: Mpesa CheckoutRequestID / PayPal order id.
      providerRef: { type: DataTypes.STRING, allowNull: true },
      providerReceipt: { type: DataTypes.STRING, allowNull: true },
      payerRef: { type: DataTypes.STRING, allowNull: true }, // phone (mpesa) / email (paypal)
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      rawCallback: { type: DataTypes.JSONB, allowNull: true },
      initiatedById: { type: DataTypes.UUID, allowNull: true },
    },
    { sequelize, modelName: 'Payment', tableName: 'payments' }
  );
  return Payment;
};
