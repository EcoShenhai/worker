'use strict';
// EcoID federation key (ECOID_DUAL_AUTHENTICATION_BLUEPRINT §9). Nullable + unique; never replaces users.id.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS global_eco_id VARCHAR(255) NULL;');
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_global_eco_id_key ON users (global_eco_id);');
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_global_eco_id_key;');
    await queryInterface.sequelize.query('ALTER TABLE users DROP COLUMN IF EXISTS global_eco_id;');
  },
};
