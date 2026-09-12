'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE tenants
      SET
        "trialStartedAt" = NOW(),
        "trialEndsAt" = NOW() + INTERVAL '7 days',
        "subscriptionStatus" = 'trialing'
      WHERE "trialStartedAt" IS NULL
        AND "trialEndsAt" IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE tenants
      SET
        "trialStartedAt" = NULL,
        "trialEndsAt" = NULL
      WHERE "subscriptionStatus" = 'trialing'
    `);
  },
};
