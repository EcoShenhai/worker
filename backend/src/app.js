'use strict';
require('./services/mailI18n').install({ app: 'Worker' }); // transactional emails in the recipient's language (72 languages)
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      const allowed = config.security.corsOrigins;
      if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// M-Pesa callback needs raw-ish JSON too; standard json parser is fine.
app.use(express.json({ limit: '2mb' }));
app.use(require('./middleware/termsConsent')); // records Terms/Privacy acceptance on signup (GDPR)
app.use(require('./middleware/territoryInject')); // Localization JSONB: req.territory for every request
app.use(express.urlencoded({ extended: true }));

// Morgan without bodies (avoid logging sensitive payloads).
app.use(morgan(config.env === 'production' ? 'combined' : 'dev', { skip: () => false }));

app.get('/health', (req, res) => res.json({ status: 'ok', app: config.appName, time: new Date().toISOString() }));

app.use(require('./utils/requestContext').middleware); // per-request context (tenant-aware AI prompts)
app.use('/api/me', require('./routes/privacy.routes')); // GDPR self-service: export + delete my data
app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
