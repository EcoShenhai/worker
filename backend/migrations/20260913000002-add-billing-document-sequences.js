'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS invoice_number_seq
      START WITH 1
      INCREMENT BY 1
      NO MINVALUE
      NO MAXVALUE
      CACHE 1;
    `);

    await queryInterface.sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS receipt_number_seq
      START WITH 1
      INCREMENT BY 1
      NO MINVALUE
      NO MAXVALUE
      CACHE 1;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS receipt_number_seq;');
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS invoice_number_seq;');
  },
};
