const express = require('express');
const { simulateNetwork } = require('./simulateNetwork');

const router = express.Router();

// A believable-looking KYC vendor: valid-looking PAN format => "verified".
router.post('/verify', async (req, res, next) => {
  try {
    await simulateNetwork();
    const { pan_number: pan } = req.body;
    const isValidFormat = typeof pan === 'string' && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);

    res.json({
      request_id: `PAN-${Date.now()}`,
      valid: isValidFormat,
      name_on_record: isValidFormat ? 'RAVI KUMAR SHARMA' : null,
      status: isValidFormat ? 'VERIFIED' : 'INVALID_FORMAT',
    });
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

module.exports = router;
