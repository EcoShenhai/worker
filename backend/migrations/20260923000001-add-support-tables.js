'use strict';
// Dual support system (Dual Support Master Reference; MediQlaim/CPAMind pattern). Additive only.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY,
        "ticketRef" VARCHAR(40) NOT NULL UNIQUE,
        "userId" UUID NOT NULL,
        "tenantId" UUID NULL,
        "globalEcoId" VARCHAR(255) NULL,
        "customerEmail" VARCHAR(255) NOT NULL,
        subject VARCHAR(240) NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        channel VARCHAR(8) NOT NULL CHECK (channel IN ('EMAIL','ECOBUS','BOTH')),
        "ecobusDelivered" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets ("userId");
      CREATE TABLE IF NOT EXISTS support_messages (
        id UUID PRIMARY KEY,
        "ticketRef" VARCHAR(60) NOT NULL,
        kind VARCHAR(32) NOT NULL CHECK (kind IN ('TICKET_RESOLVED')),
        "globalEcoId" VARCHAR(255) NULL,
        "territoryCode" VARCHAR(8) NOT NULL DEFAULT 'KE',
        resolution TEXT NOT NULL DEFAULT '',
        "resolvedBy" VARCHAR(255) NULL,
        "resolvedAt" TIMESTAMPTZ NULL,
        certified BOOLEAN NOT NULL DEFAULT false,
        read BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS support_messages_ticket_kind_uidx ON support_messages ("ticketRef", kind);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS support_messages; DROP TABLE IF EXISTS support_tickets;');
  },
};
