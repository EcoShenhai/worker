-- Worker schema — direct DDL for PostgreSQL 18 (run via psql; autocommit per statement).
-- Enums first, then tables, then indexes. Idempotent where practical.

-- ===== ENUM TYPES =====
DO $$ BEGIN CREATE TYPE "enum_users_role" AS ENUM('superadmin','admin','officer','viewer'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_users_status" AS ENUM('active','suspended'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_workspace_sessions_kind" AS ENUM('meeting','interview','briefing','dictation','field_report','consultation','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_workspace_sessions_classification" AS ENUM('unclassified','internal','confidential','restricted'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_workspace_sessions_status" AS ENUM('open','processing','ready','archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_recordings_source" AS ENUM('recorded','uploaded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_recordings_status" AS ENUM('pending','transcribing','transcribed','failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_documents_type" AS ENUM('minutes','memo','letter','report','policy_brief','briefing_note','concept_note','circular','action_matrix'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_documents_classification" AS ENUM('unclassified','internal','confidential','restricted'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_documents_status" AS ENUM('draft','in_review','approved','final','archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_document_approvals_action" AS ENUM('submitted','approved','rejected','finalized'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_emails_direction" AS ENUM('incoming','outgoing'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_emails_status" AS ENUM('draft','sent','failed','received'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_payments_provider" AS ENUM('mpesa','paypal'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_payments_status" AS ENUM('pending','completed','failed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===== TABLES =====
CREATE TABLE IF NOT EXISTS "users" ("id" UUID , "email" VARCHAR(255) NOT NULL UNIQUE, "name" VARCHAR(255) NOT NULL, "passwordHash" VARCHAR(255) NOT NULL, "role" "enum_users_role" NOT NULL DEFAULT 'officer', "department" VARCHAR(255), "status" "enum_users_status" NOT NULL DEFAULT 'active', "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false, "lastLoginAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "workspace_sessions" ("id" UUID , "title" VARCHAR(255) NOT NULL, "kind" "enum_workspace_sessions_kind" NOT NULL DEFAULT 'meeting', "referenceNumber" VARCHAR(255), "department" VARCHAR(255), "classification" "enum_workspace_sessions_classification" NOT NULL DEFAULT 'internal', "occurredOn" DATE, "location" VARCHAR(255), "attendees" JSONB NOT NULL DEFAULT '[]', "agenda" JSONB NOT NULL DEFAULT '[]', "status" "enum_workspace_sessions_status" NOT NULL DEFAULT 'open', "notes" TEXT, "ownerId" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "recordings" ("id" UUID , "sessionId" UUID NOT NULL REFERENCES "workspace_sessions" ("id") ON DELETE CASCADE, "uploadedById" UUID NOT NULL REFERENCES "users" ("id"), "source" "enum_recordings_source" NOT NULL DEFAULT 'recorded', "originalFilename" VARCHAR(255), "storageKey" VARCHAR(255) NOT NULL, "storageDriver" VARCHAR(255) NOT NULL DEFAULT 'local', "mimeType" VARCHAR(255), "sizeBytes" BIGINT, "durationSeconds" INTEGER, "status" "enum_recordings_status" NOT NULL DEFAULT 'pending', "error" TEXT, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "transcripts" ("id" UUID , "recordingId" UUID NOT NULL REFERENCES "recordings" ("id") ON DELETE CASCADE, "sessionId" UUID NOT NULL REFERENCES "workspace_sessions" ("id") ON DELETE CASCADE, "provider" VARCHAR(255) NOT NULL DEFAULT 'faster-whisper', "model" VARCHAR(255), "language" VARCHAR(255) NOT NULL DEFAULT 'en', "rawText" TEXT, "editedText" TEXT, "verified" BOOLEAN NOT NULL DEFAULT false, "verifiedById" UUID REFERENCES "users" ("id"), "wordCount" INTEGER, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "transcript_segments" ("id" UUID , "transcriptId" UUID NOT NULL REFERENCES "transcripts" ("id") ON DELETE CASCADE, "idx" INTEGER NOT NULL, "startSeconds" FLOAT, "endSeconds" FLOAT, "speaker" VARCHAR(255), "text" TEXT NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "templates" ("id" UUID , "name" VARCHAR(255) NOT NULL, "documentType" VARCHAR(255) NOT NULL, "config" JSONB NOT NULL DEFAULT '{}', "isDefault" BOOLEAN NOT NULL DEFAULT false, "createdById" UUID REFERENCES "users" ("id"), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "documents" ("id" UUID , "type" "enum_documents_type" NOT NULL, "title" VARCHAR(255) NOT NULL, "referenceNumber" VARCHAR(255), "classification" "enum_documents_classification" NOT NULL DEFAULT 'internal', "department" VARCHAR(255), "recipient" VARCHAR(255), "content" JSONB NOT NULL DEFAULT '{}', "status" "enum_documents_status" NOT NULL DEFAULT 'draft', "version" INTEGER NOT NULL DEFAULT 1, "aiAssisted" BOOLEAN NOT NULL DEFAULT false, "sessionId" UUID REFERENCES "workspace_sessions" ("id") ON DELETE SET NULL, "authorId" UUID NOT NULL REFERENCES "users" ("id"), "templateId" UUID REFERENCES "templates" ("id"), "renderedDocxKey" VARCHAR(255), "renderedPdfKey" VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "document_approvals" ("id" UUID , "documentId" UUID NOT NULL REFERENCES "documents" ("id") ON DELETE CASCADE, "actorId" UUID NOT NULL REFERENCES "users" ("id"), "action" "enum_document_approvals_action" NOT NULL, "fromStatus" VARCHAR(255), "toStatus" VARCHAR(255), "comment" TEXT, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "emails" ("id" UUID , "direction" "enum_emails_direction" NOT NULL DEFAULT 'outgoing', "fromAddress" VARCHAR(255), "toAddress" VARCHAR(255) NOT NULL, "cc" VARCHAR(255), "subject" VARCHAR(255) NOT NULL, "body" TEXT NOT NULL, "referenceNumber" VARCHAR(255), "status" "enum_emails_status" NOT NULL DEFAULT 'draft', "aiAssisted" BOOLEAN NOT NULL DEFAULT false, "finalEditedBody" TEXT, "sentAt" TIMESTAMP WITH TIME ZONE, "sentById" UUID REFERENCES "users" ("id"), "threadId" UUID, "sessionId" UUID REFERENCES "workspace_sessions" ("id") ON DELETE SET NULL, "ownerId" UUID NOT NULL REFERENCES "users" ("id"), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "knowledge_documents" ("id" UUID , "title" VARCHAR(255) NOT NULL, "category" VARCHAR(255), "storageKey" VARCHAR(255), "mimeType" VARCHAR(255), "extractedText" TEXT, "uploadedById" UUID NOT NULL REFERENCES "users" ("id"), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "payments" ("id" UUID , "provider" "enum_payments_provider" NOT NULL, "purpose" VARCHAR(255), "amount" DECIMAL(12,2) NOT NULL, "currency" VARCHAR(255) NOT NULL DEFAULT 'KES', "status" "enum_payments_status" NOT NULL DEFAULT 'pending', "providerRef" VARCHAR(255), "providerReceipt" VARCHAR(255), "payerRef" VARCHAR(255), "metadata" JSONB NOT NULL DEFAULT '{}', "rawCallback" JSONB, "initiatedById" UUID REFERENCES "users" ("id"), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "audit_logs" ("id" UUID , "userId" UUID REFERENCES "users" ("id") ON DELETE SET NULL, "action" VARCHAR(255) NOT NULL, "resourceType" VARCHAR(255), "resourceId" VARCHAR(255), "metadata" JSONB NOT NULL DEFAULT '{}', "ipAddress" VARCHAR(255), "userAgent" VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "refresh_tokens" ("id" UUID , "userId" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE, "tokenHash" VARCHAR(255) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY ("id"));

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS "recordings_session_id" ON "recordings" ("sessionId");
CREATE INDEX IF NOT EXISTS "transcripts_session_id" ON "transcripts" ("sessionId");
CREATE INDEX IF NOT EXISTS "transcripts_recording_id" ON "transcripts" ("recordingId");
CREATE INDEX IF NOT EXISTS "transcript_segments_transcript_id" ON "transcript_segments" ("transcriptId");
CREATE INDEX IF NOT EXISTS "documents_session_id" ON "documents" ("sessionId");
CREATE INDEX IF NOT EXISTS "documents_type" ON "documents" ("type");
CREATE INDEX IF NOT EXISTS "documents_status" ON "documents" ("status");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id" ON "audit_logs" ("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_action" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "payments_provider_ref" ON "payments" ("providerRef");

-- ===== Mark the Sequelize migration as applied so db:migrate is a no-op =====
CREATE TABLE IF NOT EXISTS "SequelizeMeta" ("name" VARCHAR(255) NOT NULL, PRIMARY KEY ("name"));
INSERT INTO "SequelizeMeta" ("name") VALUES ('20260907000000-init.js') ON CONFLICT DO NOTHING;
