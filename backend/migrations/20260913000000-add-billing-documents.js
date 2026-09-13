'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      const {
        UUID,
        UUIDV4,
        STRING,
        JSONB,
        DECIMAL,
        DATE,
        ENUM,
      } = Sequelize;

      const ts = {
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      };

      await queryInterface.createTable('invoices', {
        id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
        tenantId: {
          type: UUID,
          allowNull: false,
          references: { model: 'tenants', key: 'id' },
          onDelete: 'RESTRICT',
        },
        paymentId: {
          type: UUID,
          allowNull: false,
          references: { model: 'payments', key: 'id' },
          onDelete: 'RESTRICT',
        },
        invoiceNumber: { type: STRING, allowNull: false, unique: true },
        status: {
          type: ENUM('issued', 'void'),
          allowNull: false,
          defaultValue: 'issued',
        },
        issueDate: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        dueDate: { type: DATE, allowNull: true },
        currency: { type: STRING, allowNull: false },
        subtotal: { type: DECIMAL(12, 2), allowNull: false },
        taxAmount: { type: DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        totalAmount: { type: DECIMAL(12, 2), allowNull: false },
        customerName: { type: STRING, allowNull: false },
        customerEmail: { type: STRING, allowNull: true },
        customerDepartment: { type: STRING, allowNull: true },
        customerReference: { type: STRING, allowNull: true },
        taxPin: { type: STRING, allowNull: true },
        description: { type: STRING, allowNull: false },
        items: { type: JSONB, allowNull: false, defaultValue: [] },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        ...ts,
      }, { transaction: t });

      await queryInterface.createTable('receipts', {
        id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
        tenantId: {
          type: UUID,
          allowNull: false,
          references: { model: 'tenants', key: 'id' },
          onDelete: 'RESTRICT',
        },
        paymentId: {
          type: UUID,
          allowNull: false,
          references: { model: 'payments', key: 'id' },
          onDelete: 'RESTRICT',
        },
        invoiceId: {
          type: UUID,
          allowNull: false,
          references: { model: 'invoices', key: 'id' },
          onDelete: 'RESTRICT',
        },
        receiptNumber: { type: STRING, allowNull: false, unique: true },
        status: {
          type: ENUM('issued', 'void'),
          allowNull: false,
          defaultValue: 'issued',
        },
        receiptDate: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        provider: { type: ENUM('mpesa', 'paypal'), allowNull: false },
        providerReference: { type: STRING, allowNull: true },
        providerReceipt: { type: STRING, allowNull: true },
        currency: { type: STRING, allowNull: false },
        amount: { type: DECIMAL(12, 2), allowNull: false },
        payerReference: { type: STRING, allowNull: true },
        customerName: { type: STRING, allowNull: false },
        description: { type: STRING, allowNull: false },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        ...ts,
      }, { transaction: t });
    });

    const indexes = [
      ['invoices_tenant_id', 'invoices', '"tenantId"'],
      ['invoices_payment_id', 'invoices', '"paymentId"'],
      ['receipts_tenant_id', 'receipts', '"tenantId"'],
      ['receipts_payment_id', 'receipts', '"paymentId"'],
      ['receipts_invoice_id', 'receipts', '"invoiceId"'],
    ];

    for (const [name, table, column] of indexes) {
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" (${column});`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('receipts');
    await queryInterface.dropTable('invoices');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_receipts_provider";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_receipts_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_invoices_status";'
    );
  },
};
