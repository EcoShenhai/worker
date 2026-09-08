'use strict';

/** Initial schema for Worker — AI Administrative Workplace Agent. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
    const { UUID, UUIDV4, STRING, TEXT, INTEGER, BIGINT, FLOAT, BOOLEAN, DATE, DATEONLY, JSONB, ENUM, DECIMAL } = Sequelize;
    const ts = {
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    };

    await queryInterface.createTable('users', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      email: { type: STRING, allowNull: false, unique: true },
      name: { type: STRING, allowNull: false },
      passwordHash: { type: STRING, allowNull: false },
      role: { type: ENUM('superadmin', 'admin', 'officer', 'viewer'), allowNull: false, defaultValue: 'officer' },
      department: { type: STRING },
      status: { type: ENUM('active', 'suspended'), allowNull: false, defaultValue: 'active' },
      requiresPasswordChange: { type: BOOLEAN, allowNull: false, defaultValue: false },
      lastLoginAt: { type: DATE },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('workspace_sessions', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      title: { type: STRING, allowNull: false },
      kind: { type: ENUM('meeting', 'interview', 'briefing', 'dictation', 'field_report', 'consultation', 'other'), allowNull: false, defaultValue: 'meeting' },
      referenceNumber: { type: STRING },
      department: { type: STRING },
      classification: { type: ENUM('unclassified', 'internal', 'confidential', 'restricted'), allowNull: false, defaultValue: 'internal' },
      occurredOn: { type: DATEONLY },
      location: { type: STRING },
      attendees: { type: JSONB, allowNull: false, defaultValue: [] },
      agenda: { type: JSONB, allowNull: false, defaultValue: [] },
      status: { type: ENUM('open', 'processing', 'ready', 'archived'), allowNull: false, defaultValue: 'open' },
      notes: { type: TEXT },
      ownerId: { type: UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('recordings', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      sessionId: { type: UUID, allowNull: false, references: { model: 'workspace_sessions', key: 'id' }, onDelete: 'CASCADE' },
      uploadedById: { type: UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      source: { type: ENUM('recorded', 'uploaded'), allowNull: false, defaultValue: 'recorded' },
      originalFilename: { type: STRING },
      storageKey: { type: STRING, allowNull: false },
      storageDriver: { type: STRING, allowNull: false, defaultValue: 'local' },
      mimeType: { type: STRING },
      sizeBytes: { type: BIGINT },
      durationSeconds: { type: INTEGER },
      status: { type: ENUM('pending', 'transcribing', 'transcribed', 'failed'), allowNull: false, defaultValue: 'pending' },
      error: { type: TEXT },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('transcripts', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      recordingId: { type: UUID, allowNull: false, references: { model: 'recordings', key: 'id' }, onDelete: 'CASCADE' },
      sessionId: { type: UUID, allowNull: false, references: { model: 'workspace_sessions', key: 'id' }, onDelete: 'CASCADE' },
      provider: { type: STRING, allowNull: false, defaultValue: 'faster-whisper' },
      model: { type: STRING },
      language: { type: STRING, allowNull: false, defaultValue: 'en' },
      rawText: { type: TEXT },
      editedText: { type: TEXT },
      verified: { type: BOOLEAN, allowNull: false, defaultValue: false },
      verifiedById: { type: UUID, references: { model: 'users', key: 'id' } },
      wordCount: { type: INTEGER },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('transcript_segments', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      transcriptId: { type: UUID, allowNull: false, references: { model: 'transcripts', key: 'id' }, onDelete: 'CASCADE' },
      idx: { type: INTEGER, allowNull: false },
      startSeconds: { type: FLOAT },
      endSeconds: { type: FLOAT },
      speaker: { type: STRING },
      text: { type: TEXT, allowNull: false },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('templates', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      name: { type: STRING, allowNull: false },
      documentType: { type: STRING, allowNull: false },
      config: { type: JSONB, allowNull: false, defaultValue: {} },
      isDefault: { type: BOOLEAN, allowNull: false, defaultValue: false },
      createdById: { type: UUID, references: { model: 'users', key: 'id' } },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('documents', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      type: { type: ENUM('minutes', 'memo', 'letter', 'report', 'policy_brief', 'briefing_note', 'concept_note', 'circular', 'action_matrix'), allowNull: false },
      title: { type: STRING, allowNull: false },
      referenceNumber: { type: STRING },
      classification: { type: ENUM('unclassified', 'internal', 'confidential', 'restricted'), allowNull: false, defaultValue: 'internal' },
      department: { type: STRING },
      recipient: { type: STRING },
      content: { type: JSONB, allowNull: false, defaultValue: {} },
      status: { type: ENUM('draft', 'in_review', 'approved', 'final', 'archived'), allowNull: false, defaultValue: 'draft' },
      version: { type: INTEGER, allowNull: false, defaultValue: 1 },
      aiAssisted: { type: BOOLEAN, allowNull: false, defaultValue: false },
      sessionId: { type: UUID, references: { model: 'workspace_sessions', key: 'id' }, onDelete: 'SET NULL' },
      authorId: { type: UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      templateId: { type: UUID, references: { model: 'templates', key: 'id' } },
      renderedDocxKey: { type: STRING },
      renderedPdfKey: { type: STRING },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('document_approvals', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      documentId: { type: UUID, allowNull: false, references: { model: 'documents', key: 'id' }, onDelete: 'CASCADE' },
      actorId: { type: UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      action: { type: ENUM('submitted', 'approved', 'rejected', 'finalized'), allowNull: false },
      fromStatus: { type: STRING },
      toStatus: { type: STRING },
      comment: { type: TEXT },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('emails', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      direction: { type: ENUM('incoming', 'outgoing'), allowNull: false, defaultValue: 'outgoing' },
      fromAddress: { type: STRING },
      toAddress: { type: STRING, allowNull: false },
      cc: { type: STRING },
      subject: { type: STRING, allowNull: false },
      body: { type: TEXT, allowNull: false },
      referenceNumber: { type: STRING },
      status: { type: ENUM('draft', 'sent', 'failed', 'received'), allowNull: false, defaultValue: 'draft' },
      aiAssisted: { type: BOOLEAN, allowNull: false, defaultValue: false },
      finalEditedBody: { type: TEXT },
      sentAt: { type: DATE },
      sentById: { type: UUID, references: { model: 'users', key: 'id' } },
      threadId: { type: UUID },
      sessionId: { type: UUID, references: { model: 'workspace_sessions', key: 'id' }, onDelete: 'SET NULL' },
      ownerId: { type: UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('knowledge_documents', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      title: { type: STRING, allowNull: false },
      category: { type: STRING },
      storageKey: { type: STRING },
      mimeType: { type: STRING },
      extractedText: { type: TEXT },
      uploadedById: { type: UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('payments', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      provider: { type: ENUM('mpesa', 'paypal'), allowNull: false },
      purpose: { type: STRING },
      amount: { type: DECIMAL(12, 2), allowNull: false },
      currency: { type: STRING, allowNull: false, defaultValue: 'KES' },
      status: { type: ENUM('pending', 'completed', 'failed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
      providerRef: { type: STRING },
      providerReceipt: { type: STRING },
      payerRef: { type: STRING },
      metadata: { type: JSONB, allowNull: false, defaultValue: {} },
      rawCallback: { type: JSONB },
      initiatedById: { type: UUID, references: { model: 'users', key: 'id' } },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('audit_logs', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      userId: { type: UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      action: { type: STRING, allowNull: false },
      resourceType: { type: STRING },
      resourceId: { type: STRING },
      metadata: { type: JSONB, allowNull: false, defaultValue: {} },
      ipAddress: { type: STRING },
      userAgent: { type: STRING },
      ...ts,
    }, { transaction: t });

    await queryInterface.createTable('refresh_tokens', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      userId: { type: UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      tokenHash: { type: STRING, allowNull: false },
      expiresAt: { type: DATE, allowNull: false },
      revokedAt: { type: DATE },
      ...ts,
    }, { transaction: t });

    });

    // Indexes are created AFTER the table transaction commits. On PostgreSQL 18,
    // CREATE INDEX cannot see a column created earlier in the SAME transaction via
    // this driver path, so we run them here (autocommit) with IF NOT EXISTS.
    const indexes = [
      ['recordings_session_id', 'recordings', '"sessionId"'],
      ['transcripts_session_id', 'transcripts', '"sessionId"'],
      ['transcripts_recording_id', 'transcripts', '"recordingId"'],
      ['transcript_segments_transcript_id', 'transcript_segments', '"transcriptId"'],
      ['documents_session_id', 'documents', '"sessionId"'],
      ['documents_type', 'documents', '"type"'],
      ['documents_status', 'documents', '"status"'],
      ['audit_logs_user_id', 'audit_logs', '"userId"'],
      ['audit_logs_action', 'audit_logs', '"action"'],
      ['payments_provider_ref', 'payments', '"providerRef"'],
    ];
    for (const [name, tbl, col] of indexes) {
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "${name}" ON "${tbl}" (${col});`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = [
      'refresh_tokens', 'audit_logs', 'payments', 'knowledge_documents',
      'emails', 'document_approvals', 'documents', 'templates',
      'transcript_segments', 'transcripts', 'recordings', 'workspace_sessions', 'users',
    ];
    for (const t of tables) {
      await queryInterface.dropTable(t);
    }
    // Drop enum types (Postgres) created by Sequelize.
    const enums = [
      'enum_users_role', 'enum_users_status',
      'enum_workspace_sessions_kind', 'enum_workspace_sessions_classification', 'enum_workspace_sessions_status',
      'enum_recordings_source', 'enum_recordings_status',
      'enum_documents_type', 'enum_documents_classification', 'enum_documents_status',
      'enum_document_approvals_action',
      'enum_emails_direction', 'enum_emails_status',
      'enum_payments_provider', 'enum_payments_status',
    ];
    for (const e of enums) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${e}" CASCADE;`).catch(() => {});
    }
  },
};
