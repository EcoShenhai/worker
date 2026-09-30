'use strict';
// Puts the request's territory JSONB on req.territory (X-Territory header, ?territory=, user's territory, else DEFAULT_TERRITORY). Never blocks.
const jurisdiction = require('../jurisdiction');
module.exports = function territoryInject(req, res, next) {
  try {
    const wanted = req.headers['x-territory'] || req.query.territory || (req.user && (req.user.territory || req.user.territoryCode || req.user.country));
    const t = jurisdiction.get(wanted || jurisdiction.DEFAULT);
    req.territory = { code: t.code, jsonb: t.jsonb, domains: t.jsonb, fallback: !!t.fallback };
  } catch (e) { req.territory = null; }
  next();
};
