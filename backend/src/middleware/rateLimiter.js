const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Applied globally to keep the mock vendors and admin API from being
// hammered. Generated business endpoints get their own, usually looser,
// limiter instance so one noisy workflow can't starve the others.
const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please slow down.' } },
});

function perWorkflowLimiter(rateLimitConfig) {
  if (!rateLimitConfig) return (req, res, next) => next();
  return rateLimit({
    windowMs: rateLimitConfig.windowMs || 60000,
    max: rateLimitConfig.max || 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Rate limit exceeded for this API.' } },
  });
}

module.exports = { globalLimiter, perWorkflowLimiter };
