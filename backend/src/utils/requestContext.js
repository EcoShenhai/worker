'use strict';

// Per-request context so deep services (e.g. AIService) can see who is calling without
// threading req through every function. Falls back to null outside a request.
const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

function middleware(req, res, next) {
  als.run({ req }, next);
}

function currentUser() {
  const store = als.getStore();
  return store && store.req && store.req.user ? store.req.user : null;
}

module.exports = { als, middleware, currentUser };
