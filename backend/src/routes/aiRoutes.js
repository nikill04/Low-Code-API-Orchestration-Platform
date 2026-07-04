const express = require('express');
const aiAgentService = require('../services/aiAgentService');
const { requireJwt } = require('../middleware/auth');

const router = express.Router();
router.use(requireJwt);

router.post('/generate', async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description || description.trim().length < 8) {
      return res.status(400).json({ success: false, error: { message: 'Please describe the integration you want in a sentence or two.' } });
    }
    const result = await aiAgentService.generateWorkflowFromDescription(description);
    const lint = aiAgentService.lintWorkflow(result.definition);
    res.json({ success: true, data: { ...result, lint } });
  } catch (err) {
    next(err);
  }
});

router.post('/lint', (req, res) => {
  const { definition } = req.body;
  res.json({ success: true, data: aiAgentService.lintWorkflow(definition) });
});

router.post('/test-cases', (req, res) => {
  const { definition } = req.body;
  res.json({ success: true, data: aiAgentService.generateTestCases(definition) });
});

module.exports = router;
