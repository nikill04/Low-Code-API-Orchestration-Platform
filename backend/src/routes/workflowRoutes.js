const express = require('express');
const workflowService = require('../services/workflowService');
const executionLogService = require('../services/executionLogService');
const aiAgentService = require('../services/aiAgentService');
const { executeWorkflow } = require('../engine/executor');
const { requireJwt } = require('../middleware/auth');
const { listPlugins } = require('../engine/pluginLoader');

const router = express.Router();
router.use(requireJwt); // everything here is the management API, always behind a login

router.get('/', (req, res) => {
  res.json({ success: true, data: workflowService.listWorkflows() });
});

router.get('/plugins', (req, res) => {
  res.json({ success: true, data: listPlugins() });
});

router.post('/', (req, res, next) => {
  try {
    const { definition, activate = true } = req.body;
    const lint = aiAgentService.lintWorkflow(definition);
    if (!lint.valid) {
      return res.status(422).json({ success: false, error: { message: 'Workflow failed validation', issues: lint.issues } });
    }
    const workflow = workflowService.createWorkflow({
      slug: definition.slug,
      method: definition.method,
      definition,
      createdBy: req.user.sub,
      activate,
    });
    res.status(201).json({ success: true, data: workflow, lint });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  const workflow = workflowService.getWorkflow(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: { message: 'Not found' } });
  res.json({ success: true, data: { workflow, versions: workflowService.listVersions(req.params.id) } });
});

router.post('/:id/versions', (req, res, next) => {
  try {
    const { definition, activate = true } = req.body;
    const lint = aiAgentService.lintWorkflow(definition);
    if (!lint.valid) {
      return res.status(422).json({ success: false, error: { message: 'Workflow failed validation', issues: lint.issues } });
    }
    const result = workflowService.addVersion({ workflowId: req.params.id, definition, createdBy: req.user.sub, activate });
    res.status(201).json({ success: true, data: result, lint });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/versions/:version/activate', (req, res, next) => {
  try {
    const workflow = workflowService.activateVersion(req.params.id, Number(req.params.version));
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res) => {
  workflowService.deleteWorkflow(req.params.id);
  res.json({ success: true, data: { deleted: true } });
});

// Lets the workflow editor "Test" button run a draft definition without
// having to publish it first.
router.post('/test-run', async (req, res, next) => {
  try {
    const { definition, input } = req.body;
    const lint = aiAgentService.lintWorkflow(definition);
    if (!lint.valid) {
      return res.status(422).json({ success: false, error: { message: 'Workflow failed validation', issues: lint.issues } });
    }
    const result = await executeWorkflow({ definition, input: input || { body: {}, query: {}, params: {}, headers: {} } });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/logs', (req, res) => {
  res.json({ success: true, data: executionLogService.listLogs({ workflowId: req.params.id, limit: 100 }) });
});

module.exports = router;
