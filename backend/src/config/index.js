'use strict';
require('dotenv').config();

const toBool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

// Return the first defined, non-empty environment value among the given names.
// Lets Worker accept both its own variable names and the cpamind conventions
// already used on the droplet, so a cpamind-style .env slots straight in.
const pick = (...names) => {
  for (const n of names) {
    const v = process.env[n];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(pick('PORT') || '4019', 10),
  appName: pick('APP_NAME') || 'Worker',
  appUrl: pick('APP_BASE_URL', 'APP_URL') || 'https://worker.eshcloud.com',
  appDomain: pick('APP_DOMAIN') || 'worker.eshcloud.com',
  frontendUrl: pick('FRONTEND_URL') || 'https://worker.eshcloud.com',

  db: {
    url: pick('DATABASE_URL') || null,
    host: pick('DB_HOST') || '127.0.0.1',
    port: parseInt(pick('DB_PORT') || '5432', 10),
    name: pick('DB_NAME') || 'worker',
    user: pick('DB_USER') || 'worker',
    password: pick('DB_PASSWORD') || '',
    ssl: toBool(pick('DB_SSL'), false),
    logging: toBool(process.env.DB_LOGGING, false),
  },

  jwt: {
    secret: pick('JWT_ACCESS_SECRET', 'JWT_SECRET') || 'change-me-in-production',
    accessExpiresIn: pick('JWT_ACCESS_EXPIRES_IN', 'JWT_EXPIRES_IN') || '2h',
    refreshSecret:
      pick('JWT_REFRESH_SECRET') ||
      (pick('JWT_SECRET') ? `${process.env.JWT_SECRET}::refresh` : 'change-me-refresh'),
    refreshExpiresIn: pick('JWT_REFRESH_EXPIRES_IN') || '7d',
  },

  superadmin: {
    email: (pick('SUPERADMIN_EMAIL', 'SUPER_ADMIN_EMAIL') || 'pskipchumba@gmail.com').toLowerCase(),
    name: pick('SUPERADMIN_NAME', 'SUPER_ADMIN_NAME') || 'Super Administrator',
    initialPassword: pick('SUPERADMIN_INITIAL_PASSWORD', 'SUPER_ADMIN_PASSWORD') || null,
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'deepseek',
    deepseek: {
      apiKey: pick('DEEPSEEK_API_KEY') || '',
      baseUrl: pick('DEEPSEEK_BASE_URL', 'DEEPSEEK_API_BASE') || 'https://api.deepseek.com',
      model: pick('DEEPSEEK_MODEL') || 'deepseek-chat',
      reasonerModel: pick('DEEPSEEK_REASONER_MODEL') || 'deepseek-reasoner',
      timeoutMs: parseInt(process.env.DEEPSEEK_TIMEOUT_MS || '120000', 10),
      temperature: parseFloat(pick('AI_TEMPERATURE') || '0.2'),
      maxTokens: parseInt(pick('AI_MAX_TOKENS') || '4000', 10),
    },
  },

  stt: {
    provider: pick('STT_PROVIDER') || 'faster-whisper',
    language: pick('STT_LANGUAGE') || 'en',
    serviceUrl: pick('STT_SERVICE_URL') || 'http://127.0.0.1:4020',
    model: pick('STT_MODEL') || 'base.en',
    timeoutMs: parseInt(process.env.STT_TIMEOUT_MS || '900000', 10),
  },

  storage: {
    driver: pick('STORAGE_DRIVER') || 'local',
    localDir: pick('STORAGE_LOCAL_DIR', 'STORAGE_DIR') || 'uploads',
    maxUploadMb: parseInt(pick('MAX_UPLOAD_MB') || '200', 10),
    spaces: {
      endpoint: pick('SPACES_ENDPOINT') || '',
      region: pick('SPACES_REGION') || '',
      key: pick('SPACES_KEY') || '',
      secret: pick('SPACES_SECRET') || '',
      bucket: pick('SPACES_BUCKET') || '',
    },
  },

  email: {
    smtpHost: pick('SMTP_HOST') || '',
    smtpPort: parseInt(pick('SMTP_PORT') || '587', 10),
    smtpSecure: toBool(pick('SMTP_SECURE'), false),
    smtpUser: pick('SMTP_USER') || '',
    smtpPass: pick('SMTP_PASS', 'SMTP_PASSWORD') || '',
    fromName: pick('MAIL_FROM_NAME', 'SMTP_FROM_NAME') || 'Worker — Office of the President',
    fromAddress: pick('MAIL_FROM_ADDRESS', 'SMTP_FROM_EMAIL') || '',
  },

  payments: {
    mpesa: {
      enabled: process.env.MPESA_ENABLED !== undefined
        ? toBool(process.env.MPESA_ENABLED)
        : Boolean(pick('MPESA_CONSUMER_KEY') && pick('MPESA_SHORTCODE')),
      env: pick('MPESA_ENV') || 'sandbox',
      consumerKey: pick('MPESA_CONSUMER_KEY') || '',
      consumerSecret: pick('MPESA_CONSUMER_SECRET') || '',
      shortcode: pick('MPESA_SHORTCODE') || '',
      passkey: pick('MPESA_PASSKEY') || '',
      callbackUrl: pick('MPESA_CALLBACK_URL') || '',
      transactionType: pick('MPESA_TRANSACTION_TYPE') || 'CustomerPayBillOnline',
    },
    paypal: {
      enabled: process.env.PAYPAL_ENABLED !== undefined
        ? toBool(process.env.PAYPAL_ENABLED)
        : Boolean(pick('PAYPAL_CLIENT_ID')),
      env: pick('PAYPAL_ENV') || 'sandbox',
      clientId: pick('PAYPAL_CLIENT_ID') || '',
      clientSecret: pick('PAYPAL_CLIENT_SECRET') || '',
      webhookId: pick('PAYPAL_WEBHOOK_ID') || '',
      currency: pick('PAYPAL_CURRENCY') || 'USD',
    },
  },

  security: {
    bcryptRounds: parseInt(pick('BCRYPT_ROUNDS') || '12', 10),
    rateLimitWindowMs: parseInt(pick('RATE_LIMIT_WINDOW_MS') || '900000', 10),
    rateLimitMax: parseInt(pick('RATE_LIMIT_MAX') || '300', 10),
    authRateLimitMax: parseInt(pick('AUTH_RATE_LIMIT_MAX') || '20', 10),
    corsOrigins: (pick('CORS_ORIGINS', 'FRONTEND_URL') || '*')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  retention: {
    audioDays: parseInt(pick('RETENTION_AUDIO_DAYS') || '0', 10),
    auditDays: parseInt(pick('RETENTION_AUDIT_DAYS') || '0', 10),
  },
};

module.exports = config;
