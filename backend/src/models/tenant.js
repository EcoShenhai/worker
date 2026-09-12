'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Tenant extends Model {}
  Tenant.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      ownerId: { type: DataTypes.UUID, allowNull: true },
      letterheadLine1: { type: DataTypes.STRING, allowNull: true },
      letterheadLine2: { type: DataTypes.STRING, allowNull: true },
      letterheadLine3: { type: DataTypes.STRING, allowNull: true },
      logoKey: { type: DataTypes.STRING, allowNull: true },
      signatureKey: { type: DataTypes.STRING, allowNull: true },
      subscriptionPlan: { type: DataTypes.ENUM('starter', 'professional', 'business'), allowNull: true },
      subscriptionStatus: {
        type: DataTypes.ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'trialing',
      },
      trialStartedAt: { type: DataTypes.DATE, allowNull: true },
      trialEndsAt: { type: DataTypes.DATE, allowNull: true },
      subscriptionStartedAt: { type: DataTypes.DATE, allowNull: true },
      subscriptionEndsAt: { type: DataTypes.DATE, allowNull: true },
      paymentProvider: { type: DataTypes.ENUM('mpesa', 'paypal'), allowNull: true },
      subscriptionPaymentId: { type: DataTypes.UUID, allowNull: true },
    },
    { sequelize, modelName: 'Tenant', tableName: 'tenants' }
  );
  return Tenant;
};
