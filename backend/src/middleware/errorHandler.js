const logger = require('../config/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { message: `No route for ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.originalUrl });
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      message: err.expose ? err.message : status === 500 ? 'Internal server error' : err.message,
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
