const { v4: uuid } = require('uuid');
const { resolveMapping } = require('./mapper');
const { evaluateCondition } = require('./conditionEvaluator');
const { callWithRetry } = require('./httpClient');
const { getPluginFn } = require('./pluginLoader');
const { cache, buildCacheKey } = require('./cache');
const logger = require('../config/logger');

/**
 * Runs one workflow definition against an incoming request.
 *
 * A workflow definition looks like:
 * {
 *   steps: [ { id, type: 'http'|'transform'|'parallel', ... }, ... ],
 *   response: { ...mapping spec... }
 * }
 *
 * The executor builds up a `context` object as it goes:
 *   context.input  -> { body, query, params, headers } of the incoming request
 *   context.steps  -> { [stepId]: { request?, response?, output?, status, error? } }
 *
 * Later steps reference earlier ones with "{{steps.<id>.response.data.x}}" etc.
 */
class WorkflowExecutor {
  constructor({ definition, input, requestId }) {
    this.definition = definition;
    this.requestId = requestId || uuid();
    this.context = { input, steps: {} };
    this.trace = []; // ordered list of { stepId, type, status, durationMs, error? } for logging/UI
  }

  async run() {
    const startedAt = Date.now();
    try {
      for (const step of this.definition.steps) {
        await this.runStep(step);
      }
      const finalResponse = resolveMapping(this.definition.response || { status: 'success' }, this.context);
      return {
        success: true,
        requestId: this.requestId,
        durationMs: Date.now() - startedAt,
        response: finalResponse,
        trace: this.trace,
      };
    } catch (err) {
      return {
        success: false,
        requestId: this.requestId,
        durationMs: Date.now() - startedAt,
        error: { message: err.message, stepId: err.stepId },
        trace: this.trace,
      };
    }
  }

  async runStep(step) {
    // Conditional execution: skip the step (and record why) if its guard fails.
    if (step.condition && !evaluateCondition(step.condition, this.context)) {
      this.context.steps[step.id] = { status: 'skipped' };
      this.trace.push({ stepId: step.id, type: step.type, status: 'skipped' });
      return;
    }

    const startedAt = Date.now();
    try {
      switch (step.type) {
        case 'http':
          await this.runHttpStep(step);
          break;
        case 'transform':
          await this.runTransformStep(step);
          break;
        case 'parallel':
          await this.runParallelStep(step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
      this.trace.push({
        stepId: step.id,
        type: step.type,
        status: this.context.steps[step.id]?.status || 'success',
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      this.context.steps[step.id] = { status: 'error', error: err.message };
      this.trace.push({ stepId: step.id, type: step.type, status: 'error', durationMs, error: err.message });

      if (step.onError === 'continue') {
        logger.warn(`Step "${step.id}" failed but onError=continue, moving on: ${err.message}`);
        return;
      }
      const wrapped = new Error(`Step "${step.id}" failed: ${err.message}`);
      wrapped.stepId = step.id;
      throw wrapped;
    }
  }

  async runHttpStep(step) {
    const req = step.request;
    const resolvedRequest = {
      method: req.method || 'GET',
      url: resolveMapping(req.url, this.context),
      headers: resolveMapping(req.headers || {}, this.context),
      params: resolveMapping(req.params || {}, this.context),
      data: req.body ? resolveMapping(req.body, this.context) : undefined,
      timeoutMs: step.timeoutMs || 5000,
      retryConfig: step.retry || { maxAttempts: 1 },
    };

    let cacheKey = null;
    if (step.cache?.ttlSeconds) {
      cacheKey = buildCacheKey(`step:${step.id}`, resolvedRequest);
      const cached = cache.get(cacheKey);
      if (cached) {
        this.context.steps[step.id] = { request: resolvedRequest, response: cached, status: 'success', cached: true };
        return;
      }
    }

    const response = await callWithRetry(resolvedRequest);

    if (response.status >= 400 && step.onError !== 'continue') {
      const err = new Error(`Vendor returned status ${response.status}`);
      err.response = response;
      throw err;
    }

    if (cacheKey) cache.set(cacheKey, response, step.cache.ttlSeconds);
    this.context.steps[step.id] = { request: resolvedRequest, response, status: 'success' };
  }

  async runTransformStep(step) {
    const fn = getPluginFn(step.plugin, step.fn);
    const resolvedInput = resolveMapping(step.input, this.context);
    const resolvedArgs = resolveMapping(step.args || {}, this.context);
    const output = fn(resolvedInput, resolvedArgs);
    this.context.steps[step.id] = { output, status: 'success' };
  }

  async runParallelStep(step) {
    // Run each nested step concurrently, but still let each one see the
    // context as it stood *before* the parallel block started (nested
    // steps inside the same parallel block cannot depend on each other).
    const results = await Promise.allSettled(step.steps.map((nested) => this.runStep(nested)));

    const anyFailed = results.some((r) => r.status === 'rejected');
    this.context.steps[step.id] = { status: anyFailed ? 'partial_failure' : 'success' };

    if (anyFailed && step.onError !== 'continue') {
      const firstError = results.find((r) => r.status === 'rejected');
      throw firstError.reason;
    }
  }
}

async function executeWorkflow(args) {
  const executor = new WorkflowExecutor(args);
  return executor.run();
}

module.exports = { WorkflowExecutor, executeWorkflow };
