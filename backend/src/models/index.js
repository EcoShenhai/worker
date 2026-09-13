'use strict';
const sequelize = require('../config/database');

const User = require('./user')(sequelize);
const WorkspaceSession = require('./workspaceSession')(sequelize);
const Recording = require('./recording')(sequelize);
const Transcript = require('./transcript')(sequelize);
const TranscriptSegment = require('./transcriptSegment')(sequelize);
const Document = require('./document')(sequelize);
const DocumentApproval = require('./documentApproval')(sequelize);
const Email = require('./email')(sequelize);
const Template = require('./template')(sequelize);
const KnowledgeDocument = require('./knowledgeDocument')(sequelize);
const Payment = require('./payment')(sequelize);
const Invoice = require('./invoice')(sequelize);
const Receipt = require('./receipt')(sequelize);
const AuditLog = require('./auditLog')(sequelize);
const RefreshToken = require('./refreshToken')(sequelize);
const Tenant = require('./tenant')(sequelize);

// ---- Associations ----------------------------------------------------------

// Tenancy
Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'members' });
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
WorkspaceSession.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Document.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Email.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
KnowledgeDocument.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Payment.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Invoice.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Receipt.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Invoice.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
Receipt.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
Receipt.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
Payment.hasOne(Invoice, { foreignKey: 'paymentId', as: 'invoice' });
Payment.hasOne(Receipt, { foreignKey: 'paymentId', as: 'receipt' });
Invoice.hasOne(Receipt, { foreignKey: 'invoiceId', as: 'receipt' });
Template.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// User ownership
User.hasMany(WorkspaceSession, { foreignKey: 'ownerId', as: 'sessions' });
WorkspaceSession.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Session -> Recordings -> Transcript -> Segments  (auditable chain of custody)
WorkspaceSession.hasMany(Recording, { foreignKey: 'sessionId', as: 'recordings' });
Recording.belongsTo(WorkspaceSession, { foreignKey: 'sessionId', as: 'session' });
Recording.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploadedBy' });

Recording.hasOne(Transcript, { foreignKey: 'recordingId', as: 'transcript' });
Transcript.belongsTo(Recording, { foreignKey: 'recordingId', as: 'recording' });
WorkspaceSession.hasMany(Transcript, { foreignKey: 'sessionId', as: 'transcripts' });
Transcript.belongsTo(WorkspaceSession, { foreignKey: 'sessionId', as: 'session' });

Transcript.hasMany(TranscriptSegment, { foreignKey: 'transcriptId', as: 'segments', onDelete: 'CASCADE' });
TranscriptSegment.belongsTo(Transcript, { foreignKey: 'transcriptId', as: 'transcript' });

// Session -> Documents
WorkspaceSession.hasMany(Document, { foreignKey: 'sessionId', as: 'documents' });
Document.belongsTo(WorkspaceSession, { foreignKey: 'sessionId', as: 'session' });
Document.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Document.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });

Document.hasMany(DocumentApproval, { foreignKey: 'documentId', as: 'approvals', onDelete: 'CASCADE' });
DocumentApproval.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });
DocumentApproval.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

// Emails
User.hasMany(Email, { foreignKey: 'ownerId', as: 'emails' });
Email.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Email.belongsTo(WorkspaceSession, { foreignKey: 'sessionId', as: 'session' });

// Knowledge base
KnowledgeDocument.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploadedBy' });

// Payments
Payment.belongsTo(User, { foreignKey: 'initiatedById', as: 'initiatedBy' });

// Audit + tokens
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const db = {
  sequelize,
  User,
  WorkspaceSession,
  Recording,
  Transcript,
  TranscriptSegment,
  Document,
  DocumentApproval,
  Email,
  Template,
  KnowledgeDocument,
  Payment,
  Invoice,
  Receipt,
  AuditLog,
  RefreshToken,
  Tenant,
};

module.exports = db;
