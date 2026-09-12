'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'subscriptionPlan', {
      type: Sequelize.ENUM('starter', 'professional', 'business'),
      allowNull: true,
    });

    await queryInterface.addColumn('tenants', 'subscriptionStatus', {
      type: Sequelize.ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'trialing',
    });

    await queryInterface.addColumn('tenants', 'trialStartedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('tenants', 'trialEndsAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('tenants', 'subscriptionStartedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('tenants', 'subscriptionEndsAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('tenants', 'paymentProvider', {
      type: Sequelize.ENUM('mpesa', 'paypal'),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tenants', 'paymentProvider');
    await queryInterface.removeColumn('tenants', 'subscriptionEndsAt');
    await queryInterface.removeColumn('tenants', 'subscriptionStartedAt');
    await queryInterface.removeColumn('tenants', 'trialEndsAt');
    await queryInterface.removeColumn('tenants', 'trialStartedAt');
    await queryInterface.removeColumn('tenants', 'subscriptionStatus');
    await queryInterface.removeColumn('tenants', 'subscriptionPlan');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_tenants_paymentProvider";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_tenants_subscriptionStatus";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_tenants_subscriptionPlan";'
    );
  },
};
