'use strict';

// Public reference data for the registration page and settings (no sign-in required).
const router = require('express').Router();
const { TERRITORY_OPTIONS, LANGUAGE_OPTIONS } = require('../config/international');

router.get('/international', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ territories: TERRITORY_OPTIONS, languages: LANGUAGE_OPTIONS });
});

module.exports = router;
