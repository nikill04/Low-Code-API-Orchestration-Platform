const express = require('express');
const logger = require('../config/logger');

const router = express.Router();
const received = [];

router.post('/receive', (req, res) => {
  const entry = { receivedAt: new Date().toISOString(), body: req.body, headers: { 'x-webhook-event': req.headers['x-webhook-event'] } };
  received.unshift(entry);
  if (received.length > 50) received.pop();
  logger.info(`Demo webhook receiver got an event: ${req.headers['x-webhook-event']}`);
  res.json({ received: true });
});

router.get('/received', (req, res) => {
  res.json({ success: true, data: received });
});

module.exports = router;
