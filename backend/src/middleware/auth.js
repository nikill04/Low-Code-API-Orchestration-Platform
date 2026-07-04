const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../db/db');

// Protects the admin/management API (workflow CRUD, logs, metrics).
// Accepts a Bearer JWT issued by POST /api/v1/auth/login.
function requireJwt(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Missing bearer token' } });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
}

// Protects the *generated* business endpoints (e.g. POST /api/v1/run/verify-pan).
// A workflow can declare auth: { type: 'apiKey' | 'jwt' | 'none' }.
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) {
    return res.status(401).json({ success: false, error: { message: 'Missing X-API-Key header' } });
  }
  const record = db.get('apiKeys').find({ key, active: true }).value();
  if (!record) {
    return res.status(401).json({ success: false, error: { message: 'Invalid API key' } });
  }
  req.apiKeyOwner = record.ownerId;
  next();
}

// Used on generated endpoints where the workflow config decides, at
// request time, which auth strategy (if any) applies.
function dynamicAuth(authConfig) {
  if (!authConfig || authConfig.type === 'none') {
    return (req, res, next) => next();
  }
  if (authConfig.type === 'apiKey') return requireApiKey;
  if (authConfig.type === 'jwt') return requireJwt;
  return (req, res, next) => next();
}

module.exports = { requireJwt, requireApiKey, dynamicAuth };
