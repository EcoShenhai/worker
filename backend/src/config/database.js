'use strict';
const { Sequelize } = require('sequelize');
const config = require('./index');

let sequelize;

if (config.db.url) {
  sequelize = new Sequelize(config.db.url, {
    dialect: 'postgres',
    logging: config.db.logging ? console.log : false,
    dialectOptions: config.db.ssl ? { ssl: { rejectUnauthorized: false } } : {},
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  });
} else {
  sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: config.db.logging ? console.log : false,
    dialectOptions: config.db.ssl ? { ssl: { rejectUnauthorized: false } } : {},
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  });
}

module.exports = sequelize;
