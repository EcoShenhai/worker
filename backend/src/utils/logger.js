'use strict';
const winston = require('winston');
const config = require('../config');

// IMPORTANT: never log document bodies, audio, transcripts or credentials.
const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'worker-backend' },
  transports: [new winston.transports.Console()],
});

module.exports = logger;
