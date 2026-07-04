const express = require('express');
const { simulateNetwork, randomInt } = require('./simulateNetwork');

const router = express.Router();

router.post('/ocr/extract', async (req, res) => {
  try {
    await simulateNetwork();
    res.json({
      document_id: `DOC-${Date.now()}`,
      extracted_text: {
        name: 'RAVI KUMAR SHARMA',
        dob: '1990-04-12',
        document_number: `${randomInt(100000000000, 999999999999)}`,
      },
      confidence: Number((0.85 + Math.random() * 0.14).toFixed(2)),
    });
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

router.post('/fraud/check', async (req, res) => {
  try {
    await simulateNetwork();
    const riskScore = Number((Math.random() * 0.4).toFixed(2)); // biased low so demos mostly pass
    res.json({
      check_id: `FRD-${Date.now()}`,
      risk_score: riskScore,
      flagged: riskScore > 0.35,
    });
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

router.post('/face/match', async (req, res) => {
  try {
    await simulateNetwork();
    const matchScore = Number((0.7 + Math.random() * 0.29).toFixed(2));
    res.json({
      match_id: `FCM-${Date.now()}`,
      match_score: matchScore,
      match: matchScore > 0.8,
    });
  } catch (err) {
    res.status(err.status || 503).json({ error: err.message });
  }
});

module.exports = router;
