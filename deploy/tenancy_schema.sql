-- Multitenancy slice 1: tenants table + nullable tenantId columns + backfill.
-- Safe/additive: no app code references these yet, so behaviour is unchanged.

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "ownerId" UUID REFERENCES users(id),
  "letterheadLine1" VARCHAR(255),
  "letterheadLine2" VARCHAR(255),
  "letterheadLine3" VARCHAR(255),
  "logoKey" VARCHAR(255),
  "signatureKey" VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users               ADD COLUMN IF NOT EXISTS "tenantId" UUID REFERENCES tenants(id);
ALTER TABLE workspace_sessions  ADD COLUMN IF NOT EXISTS "tenantId" UUID REFERENCES tenants(id);
ALTER TABLE documents           ADD COLUMN IF NOT EXISTS "tenantId" UUID REFERENCES tenants(id);
ALTER TABLE emails              ADD COLUMN IF NOT EXISTS "tenantId" UUID REFERENCES tenants(id);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS "tenantId" UUID REFERENCES tenants(id);
ALTER TABLE payments            ADD COLUMN IF NOT EXISTS "tenantId" UUID REFERENCES tenants(id);

CREATE INDEX IF NOT EXISTS users_tenant     ON users("tenantId");
CREATE INDEX IF NOT EXISTS sessions_tenant  ON workspace_sessions("tenantId");
CREATE INDEX IF NOT EXISTS documents_tenant ON documents("tenantId");
CREATE INDEX IF NOT EXISTS emails_tenant    ON emails("tenantId");
CREATE INDEX IF NOT EXISTS knowledge_tenant ON knowledge_documents("tenantId");
CREATE INDEX IF NOT EXISTS payments_tenant  ON payments("tenantId");

-- Backfill existing test data into one legacy tenant (owned by the existing
-- officer). Superadmin stays tenantId = NULL (platform-wide). Runs once.
DO $$
DECLARE off_id uuid; t_id uuid := gen_random_uuid();
BEGIN
  IF (SELECT count(*) FROM tenants) = 0 THEN
    SELECT id INTO off_id FROM users WHERE role = 'officer' ORDER BY "createdAt" ASC LIMIT 1;
    IF off_id IS NOT NULL THEN
      INSERT INTO tenants (id, name, "ownerId", "letterheadLine1", "letterheadLine2", "createdAt", "updatedAt")
      VALUES (t_id, 'Legacy Office', off_id, 'REPUBLIC OF KENYA', 'OFFICE OF THE PRESIDENT', now(), now());
      UPDATE users               SET "tenantId" = t_id WHERE id = off_id;
      UPDATE workspace_sessions  SET "tenantId" = t_id WHERE "tenantId" IS NULL;
      UPDATE documents           SET "tenantId" = t_id WHERE "tenantId" IS NULL;
      UPDATE emails              SET "tenantId" = t_id WHERE "tenantId" IS NULL;
      UPDATE knowledge_documents SET "tenantId" = t_id WHERE "tenantId" IS NULL;
      UPDATE payments            SET "tenantId" = t_id WHERE "tenantId" IS NULL;
    END IF;
  END IF;
END $$;

SELECT 'tenants' AS t, count(*) FROM tenants
UNION ALL SELECT 'users w/ tenant', count(*) FROM users WHERE "tenantId" IS NOT NULL
UNION ALL SELECT 'users superadmin null', count(*) FROM users WHERE role='superadmin' AND "tenantId" IS NULL
UNION ALL SELECT 'sessions w/ tenant', count(*) FROM workspace_sessions WHERE "tenantId" IS NOT NULL
UNION ALL SELECT 'documents w/ tenant', count(*) FROM documents WHERE "tenantId" IS NOT NULL;
