'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'subscriptionPaymentId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tenants', 'subscriptionPaymentId');
  },
};
