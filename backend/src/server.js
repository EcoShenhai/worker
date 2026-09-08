'use strict';
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { sequelize } = require('./models');

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    // In development you may enable sync; production uses migrations.
    if (config.env !== 'production' && process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      logger.info('Database synced (dev)');
    }

    app.listen(config.port, () => {
      logger.info(`${config.appName} backend listening on port ${config.port} (${config.env})`);
    });
  } catch (err) {
    logger.error('Failed to start server', { message: err.message });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

start();
