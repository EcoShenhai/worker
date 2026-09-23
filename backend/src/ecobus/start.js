'use strict';
// Starts EcoBus consumption after the API is up. Never throws: a bus problem must not affect the API.
const ecobus = require('../config/ecobus');
const resolution = require('./supportResolutionConsumer');
const logger = require('../utils/logger');
module.exports = async function startEcoBus() {
  try { resolution.register(); await ecobus.start(); }
  catch (err) { logger.error(`[ecobus] failed to start (support resolutions will sync after next restart): ${err.message}`); }
};
