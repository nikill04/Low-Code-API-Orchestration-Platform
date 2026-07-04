const express = require('express');
const { simulateNetwork } = require('./simulateNetwork');

const router = express.Router();

router.get('/lookup', async (req, res) => {
  try {
    await simulateNetwork();
    const { pan } = req.query;

    res.json({
      pan,
      gstin: pan ? `27${pan}1Z5` : null,
      business_name: 'SHARMA TRADING CO.',
      registration_status: 'ACTIVE',
      filing_frequency: 'MONTHLY',
    });
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

module.exports = router;
