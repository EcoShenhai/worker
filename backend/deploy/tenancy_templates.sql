ALTER TABLE templates ADD COLUMN IF NOT EXISTS "tenantId" UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS templates_tenant ON templates("tenantId");
