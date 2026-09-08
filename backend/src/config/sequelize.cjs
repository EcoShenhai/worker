'use strict';
require('dotenv').config();

const toBool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const useSsl = toBool(process.env.DB_SSL, false);

const common = {
  username: process.env.DB_USER || 'worker',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'worker',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres',
  logging: toBool(process.env.DB_LOGGING, false),
  dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
};

// If DATABASE_URL is provided it takes precedence (managed DB style).
const fromUrl = false && process.env.DATABASE_URL
  ? {
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres',
      logging: toBool(process.env.DB_LOGGING, false),
      dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    }
  : null;

module.exports = {
  development: fromUrl || common,
  test: fromUrl || { ...common, database: (process.env.DB_NAME || 'worker') + '_test' },
  production: fromUrl || common,
};
