const express = require('express');
const workflowService = require('./workflowService');
const executionLogService = require('./executionLogService');
const webhookService = require('./webhookService');
const { executeWorkflow } = require('../engine/executor');
const { validateAgainstSchema } = require('../engine/validator');
const { dynamicAuth } = require('../middleware/auth');
const { perWorkflowLimiter } = require('../middleware/rateLimiter');
const logger = require('../config/logger');

const router = express.Router();

// Per-workflow rate limiter instances are expensive to build on every
// request, so we memoise them by workflowId + activeVersion. If the
// workflow is re-published with a different rate-limit block, a new
// limiter is built automatically because the cache key changes.
const limiterCache = new Map();
function getLimiterFor(workflow, definition) {
  const cacheKey = `${workflow.id}:${workflow.activeVersion}`;
  if (!limiterCache.has(cacheKey)) {
    limiterCache.set(cacheKey, perWorkflowLimiter(definition.rateLimit));
  }
  return limiterCache.get(cacheKey);
}

/**
 * Matches ANY method on /api/v1/run/:slug. We look up the workflow by
 * (slug, method) ourselves instead of registering a route per workflow -
 * that's what makes new APIs go live the instant a config is saved, with
 * zero server restarts and zero code changes.
 */
router.all('/run/:slug', async (req, res, next) => {
  const workflow = workflowService.getWorkflowBySlugAndMethod(req.params.slug, req.method);

  if (!workflow || workflow.activeVersion == null) {
    return res.status(404).json({
      success: false,
      error: { message: `No published API found for ${req.method} /run/${req.params.slug}` },
    });
  }

  const definition = workflowService.getActiveDefinition(workflow);

  // Auth + rate limiting are themselves config-driven per workflow.
  dynamicAuth(definition.auth)(req, res, (authErr) => {
    if (authErr) return next(authErr);

    getLimiterFor(workflow, definition)(req, res, async (limitErr) => {
      if (limitErr) return next(limitErr);

      const { valid, errors } = validateAgainstSchema(definition.inputSchema, req);
      if (!valid) {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors } });
      }

      const input = { body: req.body, query: req.query, params: req.params, headers: req.headers };

      const result = await executeWorkflow({ definition, input });

      executionLogService.recordExecution({
        workflowId: workflow.id,
        slug: workflow.slug,
        version: workflow.activeVersion,
        requestId: result.requestId,
        success: result.success,
        durationMs: result.durationMs,
        trace: result.trace,
        input,
        response: result.response,
        error: result.error,
      });

      if (definition.webhook?.onComplete) {
        webhookService.notify(workflow.id, {
          event: 'execution.completed',
          requestId: result.requestId,
          success: result.success,
          slug: workflow.slug,
          response: result.response,
        });
      }

      if (!result.success) {
        logger.warn(`Workflow ${workflow.slug} failed: ${result.error?.message}`);
        return res.status(502).json({
          success: false,
          requestId: result.requestId,
          error: result.error,
          trace: definition.debug ? result.trace : undefined,
        });
      }

      return res.status(definition.successStatus || 200).json({
        success: true,
        requestId: result.requestId,
        data: result.response,
        trace: definition.debug ? result.trace : undefined,
      });
    });
  });
});

module.exports = router;
