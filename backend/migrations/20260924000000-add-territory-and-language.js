'use strict';

// Territory (never "country") + language support.
// tenants.territory       ISO 3166-1 alpha-2 code from the Shenhai B2X registry (src/config/international)
// tenants.defaultLanguage registry language code; default for new sessions and drafting
// workspace_sessions.language  per-session meeting language (overrides the tenant default)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('tenants', 'territory', { type: Sequelize.STRING(2), allowNull: true }, { transaction });
      await queryInterface.addColumn('tenants', 'defaultLanguage', { type: Sequelize.STRING(8), allowNull: true }, { transaction });
      await queryInterface.addColumn('workspace_sessions', 'language', { type: Sequelize.STRING(8), allowNull: true }, { transaction });
      // Every tenant registered before this change is in Kenya and works in English.
      await queryInterface.sequelize.query(
        `UPDATE tenants SET "territory" = 'KE', "defaultLanguage" = 'en' WHERE "territory" IS NULL`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('workspace_sessions', 'language', { transaction });
      await queryInterface.removeColumn('tenants', 'defaultLanguage', { transaction });
      await queryInterface.removeColumn('tenants', 'territory', { transaction });
    });
  },
};
