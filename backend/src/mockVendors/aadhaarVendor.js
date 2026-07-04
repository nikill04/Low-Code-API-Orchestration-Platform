const express = require('express');
const { simulateNetwork } = require('./simulateNetwork');

const router = express.Router();

router.post('/validate', async (req, res) => {
  try {
    await simulateNetwork();
    const { aadhaar_number: aadhaar } = req.body;
    const digitsOnly = typeof aadhaar === 'string' ? aadhaar.replace(/\s/g, '') : '';
    const isValid = /^\d{12}$/.test(digitsOnly);

    res.json({
      reference_id: `AAD-${Date.now()}`,
      valid: isValid,
      state: isValid ? 'Maharashtra' : null,
      age_band: isValid ? '25-35' : null,
    });
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

module.exports = router;
