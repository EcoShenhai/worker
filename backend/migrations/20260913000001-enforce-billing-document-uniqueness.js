'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "invoices_payment_id_unique" ON "invoices" ("paymentId");'
    );

    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "receipts_payment_id_unique" ON "receipts" ("paymentId");'
    );

    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "receipts_invoice_id_unique" ON "receipts" ("invoiceId");'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "receipts_invoice_id_unique";'
    );

    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "receipts_payment_id_unique";'
    );

    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "invoices_payment_id_unique";'
    );
  },
};
