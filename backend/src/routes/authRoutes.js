const express = require('express');
const authService = require('../services/authService');
const { requireJwt } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { message: 'email and password are required' } });
    }
    const result = authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/api-keys', requireJwt, (req, res) => {
  res.json({ success: true, data: authService.listApiKeys(req.user.sub) });
});

router.post('/api-keys', requireJwt, (req, res) => {
  const { label } = req.body;
  const record = authService.generateApiKey(req.user.sub, label || 'Unnamed key');
  // Full key is only ever shown once, at creation time.
  res.status(201).json({ success: true, data: record });
});

router.delete('/api-keys/:id', requireJwt, (req, res) => {
  authService.revokeApiKey(req.params.id);
  res.json({ success: true, data: { revoked: true } });
});

module.exports = router;
